package com.taskboard.tasks.controller;

import com.taskboard.tasks.entity.Attachment;
import com.taskboard.tasks.repository.AttachmentRepository;
import com.taskboard.tasks.repository.TaskRepository;
import lombok.RequiredArgsConstructor;
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

    @GetMapping
    public List<Attachment> list(@PathVariable Long taskId) {
        return attachmentRepository.findByTaskId(taskId);
    }

    @PostMapping
    public ResponseEntity<Attachment> create(@PathVariable Long taskId,
                                             @Valid @RequestBody AttachmentDto dto,
                                             Authentication auth) {
        Long userId = (Long) auth.getPrincipal();
        return taskRepository.findById(taskId)
                .map(task -> {
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
    public ResponseEntity<Void> delete(@PathVariable Long taskId, @PathVariable Long id) {
        if (!attachmentRepository.existsById(id)) return ResponseEntity.notFound().build();
        attachmentRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    @Data
    public static class AttachmentDto {
        @NotBlank private String filePathOrUrl;
        private String fileName;
    }
}
