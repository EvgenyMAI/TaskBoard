package com.taskboard.analytics.integration;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.taskboard.analytics.util.JsonNodeFields;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * HTTP-загрузка задач, проектов и пользователей из tasks-service / auth-service для отчётов.
 */
@Component
@RequiredArgsConstructor
public class TasksReportIntegrationClient {

    private final ObjectMapper objectMapper;
    private final RestTemplate restTemplate = new RestTemplate();

    @Value("${app.integrations.tasks.base-url:http://tasks-service:8082}")
    private String tasksBaseUrl;

    @Value("${app.integrations.auth.base-url:http://auth-service:8081}")
    private String authBaseUrl;

    public List<JsonNode> loadTasksInPeriod(String bearerToken, Instant from, Instant to) {
        List<JsonNode> all = new ArrayList<>();
        int page = 0;
        int totalPages = 1;
        while (page < totalPages) {
            String url = tasksBaseUrl + "/api/tasks?page=" + page + "&size=200";
            JsonNode body = getJson(url, bearerToken);
            if (body == null) {
                break;
            }
            JsonNode content = body.isArray() ? body : body.path("content");
            if (content.isArray()) {
                for (JsonNode task : content) {
                    Instant filterDate = JsonNodeFields.instant(task, "dueDate");
                    if (filterDate == null) {
                        filterDate = JsonNodeFields.instant(task, "createdAt");
                    }
                    if (from != null && filterDate != null && filterDate.isBefore(from)) {
                        continue;
                    }
                    if (to != null && filterDate != null && filterDate.isAfter(to)) {
                        continue;
                    }
                    all.add(task);
                }
            }
            totalPages = body.isArray() ? 1 : body.path("totalPages").asInt(1);
            page++;
        }
        return all;
    }

    public Map<Long, String> loadProjectNames(String bearerToken) {
        Map<Long, String> map = new HashMap<>();
        JsonNode body = getJson(tasksBaseUrl + "/api/projects", bearerToken);
        if (body != null && body.isArray()) {
            for (JsonNode item : body) {
                Long id = JsonNodeFields.longVal(item, "id");
                if (id != null) {
                    map.put(id, JsonNodeFields.text(item, "name"));
                }
            }
        }
        return map;
    }

    public Map<Long, String> loadUserNames(String bearerToken) {
        Map<Long, String> map = new HashMap<>();
        JsonNode body = getJson(authBaseUrl + "/api/users", bearerToken);
        if (body != null && body.isArray()) {
            for (JsonNode item : body) {
                Long id = JsonNodeFields.longVal(item, "id");
                if (id != null) {
                    map.put(id, JsonNodeFields.text(item, "username"));
                }
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
            if (!response.getStatusCode().is2xxSuccessful() || response.getBody() == null) {
                return null;
            }
            return objectMapper.readTree(response.getBody());
        } catch (Exception ignored) {
            return null;
        }
    }
}
