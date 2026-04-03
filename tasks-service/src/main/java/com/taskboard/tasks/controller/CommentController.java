package com.taskboard.tasks.controller;

import com.taskboard.tasks.entity.Comment;
import com.taskboard.tasks.entity.Task;
import com.taskboard.tasks.repository.CommentRepository;
import com.taskboard.tasks.repository.ProjectMemberRepository;
import com.taskboard.tasks.repository.TaskRepository;
import com.taskboard.tasks.service.TaskService;
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
import java.util.Objects;

@RestController
@RequestMapping("/api/tasks/{taskId}/comments")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class CommentController {

    private final CommentRepository commentRepository;
    private final TaskRepository taskRepository;
    private final ProjectMemberRepository projectMemberRepository;
    private final TaskService taskService;

    @GetMapping
    public ResponseEntity<List<Comment>> list(@PathVariable Long taskId, Authentication auth) {
        Long userId = RoleAuthorization.userId(auth);
        boolean isExecutor = RoleAuthorization.isExecutor(auth);

        return taskRepository.findByIdWithProject(taskId)
                .map(task -> {
                    if (isExecutor) {
                        Long taskProjectId = task.getProjectId();
                        boolean isMember = taskProjectId != null
                                && projectMemberRepository.existsByIdProjectIdAndIdUserId(taskProjectId, userId);
                        if (!isMember) return ResponseEntity.ok(List.<Comment>of());
                    }
                    return ResponseEntity.ok(commentRepository.findByTaskIdOrderByCreatedAtAsc(taskId));
                })
                .orElse(ResponseEntity.<List<Comment>>notFound().build());
    }

    @PostMapping
    public ResponseEntity<Comment> create(@PathVariable Long taskId,
                                          @Valid @RequestBody CommentDto dto,
                                          Authentication auth) {
        Long userId = RoleAuthorization.userId(auth);
        boolean isExecutor = RoleAuthorization.isExecutor(auth);

        return taskRepository.findByIdWithProject(taskId)
                .map(task -> {
                    if (isExecutor) {
                        Long taskProjectId = task.getProjectId();
                        boolean isMember = taskProjectId != null
                                && projectMemberRepository.existsByIdProjectIdAndIdUserId(taskProjectId, userId);
                        if (!isMember) return ResponseEntity.status(HttpStatus.FORBIDDEN).<Comment>build();
                    }
                    Comment comment = Comment.builder()
                            .text(dto.getText())
                            .authorId(userId)
                            .task(task)
                            .build();
                    comment = commentRepository.save(comment);
                    return ResponseEntity.status(201).body(comment);
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long taskId, @PathVariable Long id, Authentication auth) {
        Long userId = RoleAuthorization.userId(auth);
        boolean isExecutor = RoleAuthorization.isExecutor(auth);
        Comment comment = commentRepository.findById(id).orElse(null);
        if (comment == null) return ResponseEntity.notFound().build();

        Long commentTaskId = comment.getTask() != null ? comment.getTask().getId() : null;
        if (!Objects.equals(commentTaskId, taskId)) {
            return ResponseEntity.notFound().build();
        }

        if (isExecutor) {
            // Для безопасности EXECUTOR может удалять только свои комментарии.
            if (comment.getAuthorId() == null || !comment.getAuthorId().equals(userId)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
            }
        }

        Task task = taskRepository.findById(taskId).orElse(null);
        if (task == null) return ResponseEntity.notFound().build();

        taskService.notifyCommentDeletedByOther(comment.getAuthorId(), userId, task.getTitle(), comment.getText());
        commentRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    @Data
    public static class CommentDto {
        @NotBlank private String text;
    }
}
