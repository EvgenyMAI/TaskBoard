package com.taskboard.analytics.controller;

import com.taskboard.analytics.dto.NotificationDto;
import com.taskboard.analytics.entity.NotificationEntity;
import com.taskboard.analytics.repository.NotificationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

/**
 * Notifications API — persisted in PostgreSQL.
 */
@RestController
@RequestMapping("/api/notifications")
@CrossOrigin(origins = "*")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationRepository notificationRepository;

    @Value("${app.notifications.internal-key:taskboard-internal-key}")
    private String internalKey;

    @GetMapping
    public ResponseEntity<List<NotificationDto>> list(Authentication auth,
                                                      @RequestParam(required = false) Boolean read,
                                                      @RequestParam(required = false) String type,
                                                      @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant from,
                                                      @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant to,
                                                      @RequestParam(required = false) String q,
                                                      @RequestParam(defaultValue = "100") int limit) {
        Long userId = (Long) auth.getPrincipal();
        int safeLimit = Math.max(1, Math.min(limit, 500));
        String normalizedType = type != null && !type.isBlank()
                ? type.trim().toUpperCase(Locale.ROOT)
                : null;
        String normalizedQ = q != null && !q.isBlank() ? q.trim() : null;

        List<NotificationDto> result = notificationRepository.findAll(
                        buildSpec(userId, read, normalizedType, from, to, normalizedQ),
                        PageRequest.of(0, safeLimit, Sort.by(Sort.Direction.DESC, "createdAt")))
                .stream()
                .map(this::toDto)
                .toList();
        return ResponseEntity.ok(result);
    }

    @GetMapping("/unread")
    public ResponseEntity<Long> unreadCount(Authentication auth) {
        Long userId = (Long) auth.getPrincipal();
        long count = notificationRepository.countByUserIdAndReadFalse(userId);
        return ResponseEntity.ok(count);
    }

    @PatchMapping("/{id}/read")
    public ResponseEntity<NotificationDto> markAsRead(@PathVariable Long id, Authentication auth) {
        Long userId = (Long) auth.getPrincipal();
        return notificationRepository.findByIdAndUserId(id, userId)
                .map(entity -> {
                    entity.setRead(true);
                    NotificationEntity saved = notificationRepository.save(entity);
                    return ResponseEntity.ok(toDto(saved));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    /**
     * Internal API: создание уведомления (вызывается tasks-service при назначении/изменении задачи).
     */
    @PostMapping
    public ResponseEntity<NotificationDto> create(Authentication auth, @RequestBody NotificationDto dto) {
        Long userId = (Long) auth.getPrincipal();
        NotificationDto safeDto = NotificationDto.builder()
                .userId(userId)
                .type(dto.getType())
                .title(dto.getTitle())
                .body(dto.getBody())
                .read(false)
                .build();
        return createInternal(safeDto);
    }

    @PostMapping("/internal")
    public ResponseEntity<NotificationDto> createInternalWithKey(@RequestHeader(value = "X-Internal-Key", required = false) String headerKey,
                                                                 @RequestBody NotificationDto dto) {
        if (headerKey == null || !headerKey.equals(internalKey)) {
            return ResponseEntity.status(401).build();
        }
        return createInternal(dto);
    }

    private ResponseEntity<NotificationDto> createInternal(NotificationDto dto) {
        NotificationEntity entity = NotificationEntity.builder()
                .userId(dto.getUserId())
                .type(dto.getType())
                .title(dto.getTitle())
                .body(dto.getBody())
                .read(dto.isRead())
                .createdAt(Instant.now())
                .build();
        NotificationEntity saved = notificationRepository.save(entity);
        return ResponseEntity.status(201).body(toDto(saved));
    }

    private NotificationDto toDto(NotificationEntity entity) {
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

    private Specification<NotificationEntity> buildSpec(Long userId,
                                                         Boolean read,
                                                         String type,
                                                         Instant from,
                                                         Instant to,
                                                         String q) {
        return (root, query, cb) -> {
            List<jakarta.persistence.criteria.Predicate> predicates = new ArrayList<>();
            predicates.add(cb.equal(root.get("userId"), userId));

            if (read != null) {
                predicates.add(cb.equal(root.get("read"), read));
            }
            if (type != null) {
                predicates.add(cb.equal(root.get("type"), type));
            }
            if (from != null) {
                predicates.add(cb.greaterThanOrEqualTo(root.get("createdAt"), from));
            }
            if (to != null) {
                predicates.add(cb.lessThanOrEqualTo(root.get("createdAt"), to));
            }
            if (q != null && !q.isBlank()) {
                String pattern = "%" + q.toLowerCase(Locale.ROOT) + "%";
                predicates.add(cb.or(
                        cb.like(cb.lower(cb.coalesce(root.get("title"), "")), pattern),
                        cb.like(cb.lower(cb.coalesce(root.get("body"), "")), pattern)
                ));
            }
            return cb.and(predicates.toArray(new jakarta.persistence.criteria.Predicate[0]));
        };
    }
}
