package com.taskboard.analytics;

import com.fasterxml.jackson.databind.ObjectMapper;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.List;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class NotificationsIntegrationTest {

    private static final String JWT_SECRET = "taskboard-auth-secret-key-min-256-bits-for-hs256";

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;

    private static String jwt(long userId, List<String> roles) {
        SecretKey key = Keys.hmacShaKeyFor(JWT_SECRET.getBytes(StandardCharsets.UTF_8));
        return Jwts.builder()
                .claim("userId", userId)
                .claim("roles", roles)
                .issuedAt(java.util.Date.from(Instant.now()))
                .signWith(key)
                .compact();
    }

    @Test
    void notificationsCrudAndSseEndpoint() throws Exception {
        String token = jwt(10L, List.of("EXECUTOR"));

        // SSE endpoint available for authenticated user (EventSource-style token param)
        mockMvc.perform(get("/api/notifications/stream")
                        .queryParam("access_token", token))
                .andExpect(status().isOk())
                .andExpect(header().string("Content-Type", org.hamcrest.Matchers.containsString("text/event-stream")));

        // Create internal notification
        mockMvc.perform(post("/api/notifications/internal")
                        .header("X-Internal-Key", "taskboard-internal-key")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"userId":10,"type":"TASK_CREATED","title":"T","body":"B"}
                                """))
                .andExpect(status().isCreated());

        // Unread count is 1
        mockMvc.perform(get("/api/notifications/unread")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(content().string("1"));

        // List has at least one entry
        String list = mockMvc.perform(get("/api/notifications")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();

        long id = objectMapper.readTree(list).get(0).get("id").asLong();

        // Mark read
        mockMvc.perform(patch("/api/notifications/" + id + "/read")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.read").value(true));

        // Unread count becomes 0
        mockMvc.perform(get("/api/notifications/unread")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(content().string("0"));
    }
}

