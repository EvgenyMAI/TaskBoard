package com.taskboard.analytics.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.time.Instant;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.*;

@Service
@RequiredArgsConstructor
public class ReportAggregationService {

    private final ObjectMapper objectMapper = new ObjectMapper();
    private final RestTemplate restTemplate = new RestTemplate();

    @Value("${app.integrations.tasks.base-url:http://tasks-service:8082}")
    private String tasksBaseUrl;

    @Value("${app.integrations.auth.base-url:http://auth-service:8081}")
    private String authBaseUrl;

    public Map<String, Object> buildSummary(String bearerToken, Instant from, Instant to) {
        List<JsonNode> tasks = loadTasks(bearerToken, from, to);
        Map<Long, String> projectNames = loadProjectNames(bearerToken);
        Map<Long, String> userNames = loadUserNames(bearerToken);
        Map<String, Object> result = computeStats(tasks, projectNames, userNames);
        result.put("generatedAt", Instant.now().toString());
        if (from != null) result.put("from", from.toString());
        if (to != null) result.put("to", to.toString());

        if (from != null && to != null && to.isAfter(from)) {
            Instant previousFrom = from.minusSeconds(to.getEpochSecond() - from.getEpochSecond());
            Instant previousTo = from;
            List<JsonNode> previousTasks = loadTasks(bearerToken, previousFrom, previousTo);
            Map<String, Object> prev = computeStats(previousTasks, projectNames, userNames);
            int currentTotal = intValue(result.get("totalTasks"));
            int previousTotal = intValue(prev.get("totalTasks"));
            int currentOverdue = intValue(result.get("overdueCount"));
            int previousOverdue = intValue(prev.get("overdueCount"));

            Map<String, Object> period = new LinkedHashMap<>();
            period.put("current", Map.of("from", from.toString(), "to", to.toString(), "totalTasks", currentTotal, "overdueCount", currentOverdue));
            period.put("previous", Map.of("from", previousFrom.toString(), "to", previousTo.toString(), "totalTasks", previousTotal, "overdueCount", previousOverdue));
            period.put("deltaTotal", currentTotal - previousTotal);
            period.put("deltaOverdue", currentOverdue - previousOverdue);
            period.put("deltaTotalPercent", percentDelta(currentTotal, previousTotal));
            period.put("deltaOverduePercent", percentDelta(currentOverdue, previousOverdue));
            result.put("periodComparison", period);
        }
        return result;
    }

    private Map<String, Object> computeStats(List<JsonNode> tasks, Map<Long, String> projectNames, Map<Long, String> userNames) {
        Map<String, Integer> byStatus = new LinkedHashMap<>();
        byStatus.put("OPEN", 0);
        byStatus.put("IN_PROGRESS", 0);
        byStatus.put("REVIEW", 0);
        byStatus.put("DONE", 0);
        byStatus.put("CANCELLED", 0);

        Map<Long, Integer> byProject = new HashMap<>();
        Map<Long, Integer> byAssignee = new HashMap<>();
        int overdue = 0;
        int withoutAssignee = 0;
        Instant now = Instant.now();
        for (JsonNode task : tasks) {
            String status = text(task, "status");
            if (status != null) byStatus.computeIfPresent(status, (k, v) -> v + 1);

            Long projectId = longVal(task, "projectId");
            if (projectId != null) byProject.merge(projectId, 1, Integer::sum);

            Long assigneeId = longVal(task, "assigneeId");
            if (assigneeId != null) byAssignee.merge(assigneeId, 1, Integer::sum);
            else withoutAssignee++;

            Instant due = instant(task, "dueDate");
            if (due != null && due.isBefore(now) && !"DONE".equals(status) && !"CANCELLED".equals(status)) {
                overdue++;
            }
        }

        List<Map<String, Object>> topProjects = toRankedList(byProject, projectNames, "projectId", "projectName");
        List<Map<String, Object>> topAssignees = toRankedList(byAssignee, userNames, "userId", "username");

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("totalTasks", tasks.size());
        result.put("overdueCount", overdue);
        result.put("withoutAssigneeCount", withoutAssignee);
        int done = byStatus.getOrDefault("DONE", 0);
        int active = byStatus.getOrDefault("OPEN", 0) + byStatus.getOrDefault("IN_PROGRESS", 0) + byStatus.getOrDefault("REVIEW", 0);
        result.put("activeCount", active);
        result.put("doneCount", done);
        result.put("completionRate", tasks.isEmpty() ? 0.0 : round2((done * 100.0) / tasks.size()));
        result.put("statusBreakdown", byStatus);
        result.put("byProject", topProjects);
        result.put("byAssignee", topAssignees);
        return result;
    }

    private List<JsonNode> loadTasks(String bearerToken, Instant from, Instant to) {
        List<JsonNode> all = new ArrayList<>();
        int page = 0;
        int totalPages = 1;
        while (page < totalPages) {
            String url = tasksBaseUrl + "/api/tasks?page=" + page + "&size=200";
            JsonNode body = getJson(url, bearerToken);
            if (body == null) break;
            JsonNode content = body.isArray() ? body : body.path("content");
            if (content.isArray()) {
                for (JsonNode task : content) {
                    // Use dueDate for period filtering when available, fallback to createdAt.
                    // This matches board-like analytics expectations for planned workload windows.
                    Instant filterDate = instant(task, "dueDate");
                    if (filterDate == null) filterDate = instant(task, "createdAt");
                    if (from != null && filterDate != null && filterDate.isBefore(from)) continue;
                    if (to != null && filterDate != null && filterDate.isAfter(to)) continue;
                    all.add(task);
                }
            }
            totalPages = body.isArray() ? 1 : body.path("totalPages").asInt(1);
            page++;
        }
        return all;
    }

    private Map<Long, String> loadProjectNames(String bearerToken) {
        Map<Long, String> map = new HashMap<>();
        JsonNode body = getJson(tasksBaseUrl + "/api/projects", bearerToken);
        if (body != null && body.isArray()) {
            for (JsonNode item : body) {
                Long id = longVal(item, "id");
                if (id != null) map.put(id, text(item, "name"));
            }
        }
        return map;
    }

    private Map<Long, String> loadUserNames(String bearerToken) {
        Map<Long, String> map = new HashMap<>();
        JsonNode body = getJson(authBaseUrl + "/api/users", bearerToken);
        if (body != null && body.isArray()) {
            for (JsonNode item : body) {
                Long id = longVal(item, "id");
                if (id != null) map.put(id, text(item, "username"));
            }
        }
        return map;
    }

    private JsonNode getJson(String url, String bearerToken) {
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.set(HttpHeaders.AUTHORIZATION, bearerToken);
            HttpEntity<Void> entity = new HttpEntity<>(headers);
            ResponseEntity<String> response = restTemplate.exchange(url, HttpMethod.GET, entity, String.class);
            if (!response.getStatusCode().is2xxSuccessful() || response.getBody() == null) return null;
            return objectMapper.readTree(response.getBody());
        } catch (Exception ignored) {
            return null;
        }
    }

    private List<Map<String, Object>> toRankedList(Map<Long, Integer> source, Map<Long, String> names, String idKey, String nameKey) {
        List<Map.Entry<Long, Integer>> items = new ArrayList<>(source.entrySet());
        items.sort((a, b) -> Integer.compare(b.getValue(), a.getValue()));
        List<Map<String, Object>> result = new ArrayList<>();
        for (Map.Entry<Long, Integer> e : items) {
            Map<String, Object> row = new LinkedHashMap<>();
            row.put(idKey, e.getKey());
            row.put(nameKey, names.getOrDefault(e.getKey(), "#" + e.getKey()));
            row.put("count", e.getValue());
            result.add(row);
        }
        return result;
    }

    private static String text(JsonNode node, String field) {
        JsonNode v = node.get(field);
        return v == null || v.isNull() ? null : v.asText();
    }

    private static Long longVal(JsonNode node, String field) {
        JsonNode v = node.get(field);
        return v == null || v.isNull() ? null : v.asLong();
    }

    private static Instant instant(JsonNode node, String field) {
        String value = text(node, field);
        if (value == null || value.isBlank()) return null;
        try {
            return Instant.parse(value);
        } catch (Exception ignored) { }
        try {
            return OffsetDateTime.parse(value).toInstant();
        } catch (Exception ignored) { }
        try {
            return LocalDateTime.parse(value).atZone(ZoneId.systemDefault()).toInstant();
        } catch (Exception ignored) { }
        return null;
    }

    private static int intValue(Object value) {
        if (value instanceof Number n) return n.intValue();
        try {
            return Integer.parseInt(String.valueOf(value));
        } catch (Exception ignored) {
            return 0;
        }
    }

    private static double percentDelta(int current, int previous) {
        if (previous == 0) return current == 0 ? 0.0 : 100.0;
        return round2(((current - previous) * 100.0) / previous);
    }

    private static double round2(double value) {
        return Math.round(value * 100.0) / 100.0;
    }
}

