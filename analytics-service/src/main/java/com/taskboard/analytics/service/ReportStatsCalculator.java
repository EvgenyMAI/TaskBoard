package com.taskboard.analytics.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.taskboard.analytics.util.JsonNodeFields;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Агрегирование метрик по списку задач (JSON nodes из tasks-service).
 */
@Component
public class ReportStatsCalculator {

    public Map<String, Object> aggregate(List<JsonNode> tasks,
                                         Map<Long, String> projectNames,
                                         Map<Long, String> userNames) {
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
            String status = JsonNodeFields.text(task, "status");
            if (status != null) {
                byStatus.computeIfPresent(status, (k, v) -> v + 1);
            }

            Long projectId = JsonNodeFields.longVal(task, "projectId");
            if (projectId != null) {
                byProject.merge(projectId, 1, Integer::sum);
            }

            Long assigneeId = JsonNodeFields.longVal(task, "assigneeId");
            if (assigneeId != null) {
                byAssignee.merge(assigneeId, 1, Integer::sum);
            } else {
                withoutAssignee++;
            }

            Instant due = JsonNodeFields.instant(task, "dueDate");
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

    public Map<String, Object> buildPeriodComparison(Map<String, Object> current,
                                                     Map<String, Object> previous,
                                                     Instant from,
                                                     Instant to,
                                                     Instant previousFrom,
                                                     Instant previousTo) {
        int currentTotal = intValue(current.get("totalTasks"));
        int previousTotal = intValue(previous.get("totalTasks"));
        int currentOverdue = intValue(current.get("overdueCount"));
        int previousOverdue = intValue(previous.get("overdueCount"));

        Map<String, Object> period = new LinkedHashMap<>();
        period.put("current", Map.of("from", from.toString(), "to", to.toString(), "totalTasks", currentTotal, "overdueCount", currentOverdue));
        period.put("previous", Map.of("from", previousFrom.toString(), "to", previousTo.toString(), "totalTasks", previousTotal, "overdueCount", previousOverdue));
        period.put("deltaTotal", currentTotal - previousTotal);
        period.put("deltaOverdue", currentOverdue - previousOverdue);
        period.put("deltaTotalPercent", percentDelta(currentTotal, previousTotal));
        period.put("deltaOverduePercent", percentDelta(currentOverdue, previousOverdue));
        return period;
    }

    public static int intValue(Object value) {
        if (value instanceof Number n) {
            return n.intValue();
        }
        try {
            return Integer.parseInt(String.valueOf(value));
        } catch (Exception ignored) {
            return 0;
        }
    }

    private static List<Map<String, Object>> toRankedList(Map<Long, Integer> source, Map<Long, String> names, String idKey, String nameKey) {
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

    private static double percentDelta(int current, int previous) {
        if (previous == 0) {
            return current == 0 ? 0.0 : 100.0;
        }
        return round2(((current - previous) * 100.0) / previous);
    }

    private static double round2(double value) {
        return Math.round(value * 100.0) / 100.0;
    }
}
