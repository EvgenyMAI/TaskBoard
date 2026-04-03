package com.taskboard.analytics.service;

import com.taskboard.analytics.dto.NotificationDto;
import com.taskboard.analytics.entity.NotificationEntity;
import com.taskboard.analytics.repository.NotificationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Locale;

@Service
@RequiredArgsConstructor
public class NotificationApplicationService {

    private final NotificationRepository notificationRepository;
    private final NotificationSseRegistry sseRegistry;

    public List<NotificationDto> listForUser(Long userId,
                                              Boolean read,
                                              String type,
                                              Instant from,
                                              Instant to,
                                              String q,
                                              int limit) {
        int safeLimit = Math.max(1, Math.min(limit, 500));
        String normalizedType = type != null && !type.isBlank()
                ? type.trim().toUpperCase(Locale.ROOT)
                : null;
        String normalizedQ = q != null && !q.isBlank() ? q.trim() : null;

        var spec = NotificationSpecificationBuilder.forUserFilters(
                userId, read, normalizedType, from, to, normalizedQ);

        return notificationRepository.findAll(
                        spec,
                        PageRequest.of(0, safeLimit, Sort.by(Sort.Direction.DESC, "createdAt")))
                .stream()
                .map(NotificationMapper::toDto)
                .toList();
    }

    public long unreadCount(Long userId) {
        return notificationRepository.countByUserIdAndReadFalse(userId);
    }

    @Transactional
    public ResponseEntity<NotificationDto> markAsRead(Long id, Long userId) {
        return notificationRepository.findByIdAndUserId(id, userId)
                .map(entity -> {
                    entity.setRead(true);
                    NotificationEntity saved = notificationRepository.save(entity);
                    return ResponseEntity.ok(NotificationMapper.toDto(saved));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @Transactional
    public ResponseEntity<NotificationDto> createForAuthenticatedUser(Long userId, NotificationDto dto) {
        NotificationDto safeDto = NotificationDto.builder()
                .userId(userId)
                .type(dto.getType())
                .title(dto.getTitle())
                .body(dto.getBody())
                .read(false)
                .build();
        return createAndBroadcast(safeDto);
    }

    @Transactional
    public ResponseEntity<NotificationDto> createInternal(NotificationDto dto) {
        return createAndBroadcast(dto);
    }

    private ResponseEntity<NotificationDto> createAndBroadcast(NotificationDto dto) {
        NotificationEntity entity = NotificationEntity.builder()
                .userId(dto.getUserId())
                .type(dto.getType())
                .title(dto.getTitle())
                .body(dto.getBody())
                .read(dto.isRead())
                .createdAt(Instant.now())
                .build();
        NotificationEntity saved = notificationRepository.save(entity);
        NotificationDto out = NotificationMapper.toDto(saved);
        sseRegistry.broadcastToUser(dto.getUserId(), out);
        return ResponseEntity.status(201).body(out);
    }
}
