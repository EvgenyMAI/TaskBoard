package com.taskboard.analytics.controller;

import com.taskboard.analytics.dto.NotificationDto;
import com.taskboard.analytics.service.NotificationApplicationService;
import com.taskboard.analytics.service.NotificationSseRegistry;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;

import java.lang.reflect.Field;
import java.time.Instant;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class NotificationControllerTest {

    @Mock
    private NotificationApplicationService notificationApplicationService;

    @Mock
    private NotificationSseRegistry notificationSseRegistry;

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
        NotificationDto payload = NotificationDto.builder()
                .userId(999L)
                .type("TASK_CREATED")
                .title("Title")
                .body("Body")
                .read(true)
                .build();

        NotificationDto saved = NotificationDto.builder()
                .id(100L)
                .userId(42L)
                .type("TASK_CREATED")
                .title("Title")
                .body("Body")
                .read(false)
                .createdAt(Instant.now())
                .build();

        when(notificationApplicationService.createForAuthenticatedUser(eq(42L), eq(payload)))
                .thenReturn(ResponseEntity.status(201).body(saved));

        var auth = new UsernamePasswordAuthenticationToken(42L, null);
        var response = notificationController.create(auth, payload);

        assertEquals(201, response.getStatusCode().value());
        assertNotNull(response.getBody());
        assertEquals(42L, response.getBody().getUserId());
        assertEquals(false, response.getBody().isRead());

        verify(notificationApplicationService).createForAuthenticatedUser(eq(42L), eq(payload));
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
        verifyNoInteractions(notificationApplicationService);
    }
}
