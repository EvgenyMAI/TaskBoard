package com.taskboard.tasks.controller;

import com.taskboard.tasks.dto.TaskWriteDto;
import com.taskboard.tasks.entity.Task;
import com.taskboard.tasks.service.TaskCommandService;
import com.taskboard.tasks.service.TaskQueryService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/tasks")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class TaskController {

    private final TaskQueryService taskQueryService;
    private final TaskCommandService taskCommandService;

    @GetMapping
    public ResponseEntity<?> list(
            @RequestParam(required = false) Long projectId,
            @RequestParam(required = false) Task.TaskStatus status,
            @RequestParam(required = false) Long assigneeId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            Authentication auth
    ) {
        return taskQueryService.listTasks(projectId, status, assigneeId, page, size, auth);
    }

    @GetMapping("/{id}")
    public ResponseEntity<Task> get(@PathVariable Long id, Authentication auth) {
        return taskQueryService.getTask(id, auth);
    }

    @PostMapping
    public ResponseEntity<Task> create(@Valid @RequestBody TaskWriteDto dto, Authentication auth) {
        return taskCommandService.create(dto, auth);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Task> update(@PathVariable Long id,
                                       @Valid @RequestBody TaskWriteDto dto,
                                       Authentication auth) {
        return taskCommandService.update(id, dto, auth);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id, Authentication auth) {
        return taskCommandService.delete(id, auth);
    }
}
