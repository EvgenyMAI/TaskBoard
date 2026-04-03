package com.taskboard.analytics.service;

import com.taskboard.analytics.dto.NotificationDto;
import com.taskboard.analytics.entity.NotificationEntity;
public final class NotificationMapper {

    private NotificationMapper() {
    }

    public static NotificationDto toDto(NotificationEntity entity) {
        return NotificationDto.builder()
                .id(entity.getId())
                .userId(entity.getUserId())
                .type(entity.getType())
                .title(entity.getTitle())
                .body(entity.getBody())
                .read(entity.isRead())
                .createdAt(entity.getCreatedAt())
                .build();
    }
}
