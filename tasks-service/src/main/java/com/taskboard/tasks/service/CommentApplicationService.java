package com.taskboard.tasks.service;

import com.taskboard.tasks.dto.CommentCreateDto;
import com.taskboard.tasks.entity.Comment;
import com.taskboard.tasks.entity.Task;
import com.taskboard.tasks.repository.CommentRepository;
import com.taskboard.tasks.repository.ProjectMemberRepository;
import com.taskboard.tasks.repository.TaskRepository;
import com.taskboard.tasks.security.RoleAuthorization;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Objects;

@Service
@RequiredArgsConstructor
public class CommentApplicationService {

    private final CommentRepository commentRepository;
    private final TaskRepository taskRepository;
    private final ProjectMemberRepository projectMemberRepository;
    private final TaskService taskService;

    public ResponseEntity<List<Comment>> list(Long taskId, Authentication auth) {
        Long userId = RoleAuthorization.userId(auth);
        boolean isExecutor = RoleAuthorization.isExecutor(auth);

        return taskRepository.findByIdWithProject(taskId)
                .map(task -> {
                    if (isExecutor) {
                        Long taskProjectId = task.getProjectId();
                        boolean isMember = taskProjectId != null
                                && projectMemberRepository.existsByIdProjectIdAndIdUserId(taskProjectId, userId);
                        if (!isMember) {
                            return ResponseEntity.ok(List.<Comment>of());
                        }
                    }
                    return ResponseEntity.ok(commentRepository.findByTaskIdOrderByCreatedAtAsc(taskId));
                })
                .orElse(ResponseEntity.<List<Comment>>notFound().build());
    }

    @Transactional
    public ResponseEntity<Comment> create(Long taskId, CommentCreateDto dto, Authentication auth) {
        Long userId = RoleAuthorization.userId(auth);
        boolean isExecutor = RoleAuthorization.isExecutor(auth);

        return taskRepository.findByIdWithProject(taskId)
                .map(task -> {
                    if (isExecutor) {
                        Long taskProjectId = task.getProjectId();
                        boolean isMember = taskProjectId != null
                                && projectMemberRepository.existsByIdProjectIdAndIdUserId(taskProjectId, userId);
                        if (!isMember) {
                            return ResponseEntity.status(HttpStatus.FORBIDDEN).<Comment>build();
                        }
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

    @Transactional
    public ResponseEntity<Void> delete(Long taskId, Long commentId, Authentication auth) {
        Long userId = RoleAuthorization.userId(auth);
        boolean isExecutor = RoleAuthorization.isExecutor(auth);
        Comment comment = commentRepository.findById(commentId).orElse(null);
        if (comment == null) {
            return ResponseEntity.notFound().build();
        }

        Long commentTaskId = comment.getTask() != null ? comment.getTask().getId() : null;
        if (!Objects.equals(commentTaskId, taskId)) {
            return ResponseEntity.notFound().build();
        }

        if (isExecutor) {
            if (comment.getAuthorId() == null || !comment.getAuthorId().equals(userId)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
            }
        }

        Task task = taskRepository.findById(taskId).orElse(null);
        if (task == null) {
            return ResponseEntity.notFound().build();
        }

        taskService.notifyCommentDeletedByOther(comment.getAuthorId(), userId, task.getTitle(), comment.getText());
        commentRepository.deleteById(commentId);
        return ResponseEntity.noContent().build();
    }
}
