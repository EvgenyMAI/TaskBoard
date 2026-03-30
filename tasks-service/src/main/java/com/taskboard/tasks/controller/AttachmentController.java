package com.taskboard.tasks.controller;

import com.taskboard.tasks.entity.Attachment;
import com.taskboard.tasks.repository.AttachmentRepository;
import com.taskboard.tasks.repository.ProjectMemberRepository;
import com.taskboard.tasks.repository.TaskRepository;
import com.taskboard.tasks.security.RoleAuthorization;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

import java.util.List;

@RestController
@RequestMapping("/api/tasks/{taskId}/attachments")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class AttachmentController {

    private final AttachmentRepository attachmentRepository;
    private final TaskRepository taskRepository;
    private final ProjectMemberRepository projectMemberRepository;

    @GetMapping
    public ResponseEntity<List<Attachment>> list(@PathVariable Long taskId, Authentication auth) {
        Long userId = RoleAuthorization.userId(auth);
        boolean isExecutor = RoleAuthorization.isExecutor(auth);

        return taskRepository.findByIdWithProject(taskId)
                .map(task -> {
                    if (isExecutor) {
                        Long taskProjectId = task.getProjectId();
                        boolean isMember = taskProjectId != null
                                && projectMemberRepository.existsByIdProjectIdAndIdUserId(taskProjectId, userId);
                        if (!isMember) {
                            return ResponseEntity.ok(List.<Attachment>of());
                        }
                    }
                    return ResponseEntity.ok(attachmentRepository.findByTaskId(taskId));
                })
                .orElse(ResponseEntity.<List<Attachment>>notFound().build());
    }

    @PostMapping
    public ResponseEntity<Attachment> create(@PathVariable Long taskId,
                                             @Valid @RequestBody AttachmentDto dto,
                                             Authentication auth) {
        Long userId = RoleAuthorization.userId(auth);
        boolean isExecutor = RoleAuthorization.isExecutor(auth);
        return taskRepository.findById(taskId)
                .map(task -> {
                    if (isExecutor && (task.getAssigneeId() == null || !task.getAssigneeId().equals(userId))) {
                        return ResponseEntity.status(HttpStatus.FORBIDDEN).<Attachment>build();
                    }
                    if (isExecutor) {
                        Long taskProjectId = task.getProjectId();
                        boolean isMember = taskProjectId != null
                                && projectMemberRepository.existsByIdProjectIdAndIdUserId(taskProjectId, userId);
                        if (!isMember) {
                            return ResponseEntity.status(HttpStatus.FORBIDDEN).<Attachment>build();
                        }
                    }
                    Attachment att = Attachment.builder()
                            .filePathOrUrl(dto.getFilePathOrUrl())
                            .fileName(dto.getFileName())
                            .uploadedBy(userId)
                            .task(task)
                            .build();
                    att = attachmentRepository.save(att);
                    return ResponseEntity.status(201).body(att);
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long taskId, @PathVariable Long id, Authentication auth) {
        Long userId = RoleAuthorization.userId(auth);
        boolean isExecutor = RoleAuthorization.isExecutor(auth);
        Attachment att = attachmentRepository.findById(id).orElse(null);
        if (att == null) return ResponseEntity.notFound().build();

        if (isExecutor) {
            if (att.getUploadedBy() == null || !att.getUploadedBy().equals(userId)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
            }
            if (att.getTask() != null && att.getTask().getId() != null && !att.getTask().getId().equals(taskId)) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
            }
        }

        attachmentRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    @Data
    public static class AttachmentDto {
        @NotBlank private String filePathOrUrl;
        private String fileName;
    }
}
