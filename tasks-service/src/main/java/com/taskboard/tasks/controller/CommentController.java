package com.taskboard.tasks.controller;

import com.taskboard.tasks.entity.Comment;
import com.taskboard.tasks.repository.CommentRepository;
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
@RequestMapping("/api/tasks/{taskId}/comments")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class CommentController {

    private final CommentRepository commentRepository;
    private final TaskRepository taskRepository;

    @GetMapping
    public List<Comment> list(@PathVariable Long taskId) {
        return commentRepository.findByTaskIdOrderByCreatedAtAsc(taskId);
    }

    @PostMapping
    public ResponseEntity<Comment> create(@PathVariable Long taskId,
                                          @Valid @RequestBody CommentDto dto,
                                          Authentication auth) {
        Long userId = (Long) auth.getPrincipal();
        return taskRepository.findById(taskId)
                .map(task -> {
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
    public ResponseEntity<Void> delete(@PathVariable Long taskId, @PathVariable Long id) {
        if (!commentRepository.existsById(id)) return ResponseEntity.notFound().build();
        commentRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    @Data
    public static class CommentDto {
        @NotBlank private String text;
    }
}
