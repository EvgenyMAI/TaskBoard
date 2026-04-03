package com.taskboard.tasks.controller;

import com.taskboard.tasks.dto.CommentCreateDto;
import com.taskboard.tasks.entity.Comment;
import com.taskboard.tasks.service.CommentApplicationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/tasks/{taskId}/comments")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class CommentController {

    private final CommentApplicationService commentApplicationService;

    @GetMapping
    public ResponseEntity<List<Comment>> list(@PathVariable Long taskId, Authentication auth) {
        return commentApplicationService.list(taskId, auth);
    }

    @PostMapping
    public ResponseEntity<Comment> create(@PathVariable Long taskId,
                                          @Valid @RequestBody CommentCreateDto dto,
                                          Authentication auth) {
        return commentApplicationService.create(taskId, dto, auth);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long taskId, @PathVariable Long id, Authentication auth) {
        return commentApplicationService.delete(taskId, id, auth);
    }
}
