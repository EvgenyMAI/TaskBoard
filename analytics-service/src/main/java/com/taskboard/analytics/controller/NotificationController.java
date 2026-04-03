package com.taskboard.analytics.controller;

import com.taskboard.analytics.dto.NotificationDto;
import com.taskboard.analytics.service.NotificationApplicationService;
import com.taskboard.analytics.service.NotificationSseRegistry;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.MediaType;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.time.Instant;
import java.util.List;

/**
 * Notifications API — persisted in PostgreSQL; realtime через SSE.
 */
@RestController
@RequestMapping("/api/notifications")
@CrossOrigin(origins = "*")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationApplicationService notificationApplicationService;
    private final NotificationSseRegistry notificationSseRegistry;

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
        return ResponseEntity.ok(notificationApplicationService.listForUser(userId, read, type, from, to, q, limit));
    }

    @GetMapping("/unread")
    public ResponseEntity<Long> unreadCount(Authentication auth) {
        Long userId = (Long) auth.getPrincipal();
        return ResponseEntity.ok(notificationApplicationService.unreadCount(userId));
    }

    @GetMapping(value = "/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter stream(Authentication auth) {
        Long userId = (Long) auth.getPrincipal();
        return notificationSseRegistry.subscribe(userId);
    }

    @PatchMapping("/{id}/read")
    public ResponseEntity<NotificationDto> markAsRead(@PathVariable Long id, Authentication auth) {
        Long userId = (Long) auth.getPrincipal();
        return notificationApplicationService.markAsRead(id, userId);
    }

    @PostMapping
    public ResponseEntity<NotificationDto> create(Authentication auth, @RequestBody NotificationDto dto) {
        Long userId = (Long) auth.getPrincipal();
        return notificationApplicationService.createForAuthenticatedUser(userId, dto);
    }

    @PostMapping("/internal")
    public ResponseEntity<NotificationDto> createInternalWithKey(@RequestHeader(value = "X-Internal-Key", required = false) String headerKey,
                                                                 @RequestBody NotificationDto dto) {
        if (headerKey == null || !headerKey.equals(internalKey)) {
            return ResponseEntity.status(401).build();
        }
        return notificationApplicationService.createInternal(dto);
    }
}
