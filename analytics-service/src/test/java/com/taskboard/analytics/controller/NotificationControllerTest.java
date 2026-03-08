package com.taskboard.analytics.controller;

import com.taskboard.analytics.dto.NotificationDto;
import com.taskboard.analytics.entity.NotificationEntity;
import com.taskboard.analytics.repository.NotificationRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;

import java.lang.reflect.Field;
import java.time.Instant;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class NotificationControllerTest {

    @Mock
    private NotificationRepository notificationRepository;

    @InjectMocks
    private NotificationController notificationController;

    @BeforeEach
    void setUp() throws Exception {
        Field field = NotificationController.class.getDeclaredField("internalKey");
        field.setAccessible(true);
        field.set(notificationController, "test-internal-key");
    }

    @Test
    void createUsesAuthenticatedUserIdAndIgnoresPayloadUserId() {
        when(notificationRepository.save(any(NotificationEntity.class)))
                .thenAnswer(invocation -> {
                    NotificationEntity entity = invocation.getArgument(0);
                    entity.setId(100L);
                    entity.setCreatedAt(Instant.now());
                    return entity;
                });

        NotificationDto payload = NotificationDto.builder()
                .userId(999L)
                .type("TASK_CREATED")
                .title("Title")
                .body("Body")
                .read(true)
                .build();

        var auth = new UsernamePasswordAuthenticationToken(42L, null);
        var response = notificationController.create(auth, payload);

        assertEquals(201, response.getStatusCode().value());
        assertNotNull(response.getBody());
        assertEquals(42L, response.getBody().getUserId());
        assertEquals(false, response.getBody().isRead());

        ArgumentCaptor<NotificationEntity> captor = ArgumentCaptor.forClass(NotificationEntity.class);
        verify(notificationRepository).save(captor.capture());
        assertEquals(42L, captor.getValue().getUserId());
        assertEquals(false, captor.getValue().isRead());
    }

    @Test
    void internalCreateRejectsWrongKey() {
        NotificationDto payload = NotificationDto.builder()
                .userId(5L)
                .type("TASK_CREATED")
                .title("Title")
                .body("Body")
                .build();

        var response = notificationController.createInternalWithKey("wrong-key", payload);
        assertEquals(401, response.getStatusCode().value());
    }
}
