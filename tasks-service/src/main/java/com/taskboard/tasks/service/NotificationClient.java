package com.taskboard.tasks.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import java.util.Map;

@Slf4j
@Component
@RequiredArgsConstructor
public class NotificationClient {

    private final RestTemplate restTemplate;

    @Value("${app.notifications.base-url:http://localhost:8083}")
    private String baseUrl;

    @Value("${app.notifications.internal-key:taskboard-internal-key}")
    private String internalKey;

    public void createNotification(Long userId, String type, String title, String body) {
        if (userId == null) return;
        String url = baseUrl + "/api/notifications/internal";

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("X-Internal-Key", internalKey);

        Map<String, Object> payload = Map.of(
                "userId", userId,
                "type", type,
                "title", title,
                "body", body
        );

        try {
            restTemplate.postForEntity(url, new HttpEntity<>(payload, headers), Void.class);
        } catch (Exception ex) {
            // Notifications are non-critical for task workflows.
            log.warn("Failed to send notification to analytics-service: {}", ex.getMessage());
        }
    }
}
