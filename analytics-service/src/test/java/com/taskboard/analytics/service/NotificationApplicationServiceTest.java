package com.taskboard.analytics.service;

import com.taskboard.analytics.dto.NotificationDto;
import com.taskboard.analytics.entity.NotificationEntity;
import com.taskboard.analytics.repository.NotificationRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoMoreInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class NotificationApplicationServiceTest {

    @Mock
    private NotificationRepository notificationRepository;

    @Mock
    private NotificationSseRegistry sseRegistry;

    @InjectMocks
    private NotificationApplicationService service;

    @Test
    void listForUserClampsLimitToAtLeastOne() {
        @SuppressWarnings("unchecked")
        ArgumentCaptor<PageRequest> pageCaptor = ArgumentCaptor.forClass(PageRequest.class);
        when(notificationRepository.findAll(any(Specification.class), pageCaptor.capture()))
                .thenReturn(new PageImpl<>(List.of()));

        service.listForUser(1L, null, null, null, null, null, 0);

        assertEquals(1, pageCaptor.getValue().getPageSize());
    }

    @Test
    void listForUserClampsLimitToMax500() {
        @SuppressWarnings("unchecked")
        ArgumentCaptor<PageRequest> pageCaptor = ArgumentCaptor.forClass(PageRequest.class);
        when(notificationRepository.findAll(any(Specification.class), pageCaptor.capture()))
                .thenReturn(new PageImpl<>(List.of()));

        service.listForUser(1L, null, null, null, null, null, 10_000);

        assertEquals(500, pageCaptor.getValue().getPageSize());
    }

    @Test
    void unreadCountDelegatesToRepository() {
        when(notificationRepository.countByUserIdAndReadFalse(42L)).thenReturn(3L);
        assertEquals(3L, service.unreadCount(42L));
        verify(notificationRepository).countByUserIdAndReadFalse(42L);
    }

    @Test
    void markAsReadReturnsNotFoundWhenMissing() {
        when(notificationRepository.findByIdAndUserId(9L, 1L)).thenReturn(Optional.empty());
        var res = service.markAsRead(9L, 1L);
        assertEquals(HttpStatus.NOT_FOUND, res.getStatusCode());
        verifyNoMoreInteractions(sseRegistry);
    }

    @Test
    void markAsReadPersistsAndReturnsDto() {
        NotificationEntity entity = NotificationEntity.builder()
                .id(5L)
                .userId(1L)
                .type("T")
                .title("Title")
                .body("B")
                .read(false)
                .createdAt(Instant.parse("2024-01-01T12:00:00Z"))
                .build();
        when(notificationRepository.findByIdAndUserId(5L, 1L)).thenReturn(Optional.of(entity));
        when(notificationRepository.save(any(NotificationEntity.class))).thenAnswer(inv -> inv.getArgument(0));

        var res = service.markAsRead(5L, 1L);

        assertTrue(res.getStatusCode().is2xxSuccessful());
        assertTrue(res.getBody().isRead());
        verify(notificationRepository).save(entity);
    }

    @Test
    void createForAuthenticatedUserForcesUserAndUnread() {
        NotificationDto in = NotificationDto.builder()
                .userId(999L)
                .type("X")
                .title("T")
                .body("B")
                .read(true)
                .build();

        when(notificationRepository.save(any(NotificationEntity.class))).thenAnswer(inv -> {
            NotificationEntity e = inv.getArgument(0);
            e.setId(100L);
            return e;
        });

        var res = service.createForAuthenticatedUser(7L, in);

        assertEquals(HttpStatus.CREATED, res.getStatusCode());
        assertEquals(7L, res.getBody().getUserId());
        assertFalse(res.getBody().isRead());

        ArgumentCaptor<NotificationEntity> entityCaptor = ArgumentCaptor.forClass(NotificationEntity.class);
        verify(notificationRepository).save(entityCaptor.capture());
        assertEquals(7L, entityCaptor.getValue().getUserId());
        assertFalse(entityCaptor.getValue().isRead());

        ArgumentCaptor<NotificationDto> sseCaptor = ArgumentCaptor.forClass(NotificationDto.class);
        verify(sseRegistry).broadcastToUser(eq(7L), sseCaptor.capture());
        assertEquals(7L, sseCaptor.getValue().getUserId());
    }

    @Test
    void createInternalPreservesReadFlagFromDto() {
        NotificationDto in = NotificationDto.builder()
                .userId(3L)
                .type("Y")
                .title("T")
                .body("B")
                .read(true)
                .build();

        when(notificationRepository.save(any(NotificationEntity.class))).thenAnswer(inv -> {
            NotificationEntity e = inv.getArgument(0);
            e.setId(2L);
            return e;
        });

        var res = service.createInternal(in);

        assertEquals(HttpStatus.CREATED, res.getStatusCode());
        ArgumentCaptor<NotificationEntity> entityCaptor = ArgumentCaptor.forClass(NotificationEntity.class);
        verify(notificationRepository).save(entityCaptor.capture());
        assertTrue(entityCaptor.getValue().isRead());
    }
}
