package com.taskboard.analytics.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

/**
 * In-memory / API notification. For MVP no real email sending.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class NotificationDto {

    private Long id;
    private Long userId;
    private String type;   // TASK_ASSIGNED, TASK_UPDATED, TASK_DUE_SOON, etc.
    private String title;
    private String body;
    private boolean read;
    private Instant createdAt;
}
