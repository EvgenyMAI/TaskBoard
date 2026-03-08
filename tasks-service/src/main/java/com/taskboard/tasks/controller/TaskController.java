package com.taskboard.tasks.controller;

import com.taskboard.tasks.entity.Task;
import com.taskboard.tasks.repository.ProjectRepository;
import com.taskboard.tasks.repository.TaskRepository;
import com.taskboard.tasks.service.TaskService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/tasks")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class TaskController {

    private final TaskRepository taskRepository;
    private final ProjectRepository projectRepository;
    private final TaskService taskService;

    @GetMapping
    public ResponseEntity<?> list(
            @RequestParam(required = false) Long projectId,
            @RequestParam(required = false) Task.TaskStatus status,
            @RequestParam(required = false) Long assigneeId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        if (projectId != null) {
            Page<Task> result = taskRepository.findByProjectAndFilters(
                    projectId, status, assigneeId, PageRequest.of(page, size));
            return ResponseEntity.ok(result);
        }
        if (assigneeId != null) {
            return ResponseEntity.ok(taskRepository.findByAssigneeId(assigneeId));
        }
        return ResponseEntity.ok(taskRepository.findAll(PageRequest.of(page, size)));
    }

    @GetMapping("/{id}")
    public ResponseEntity<Task> get(@PathVariable Long id) {
        return taskRepository.findByIdWithProject(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<Task> create(@Valid @RequestBody TaskDto dto, Authentication auth) {
        Long userId = (Long) auth.getPrincipal();
        return projectRepository.findById(dto.getProjectId())
                .map(project -> {
                    Task task = Task.builder()
                            .title(dto.getTitle())
                            .description(dto.getDescription())
                            .status(dto.getStatus() != null ? dto.getStatus() : Task.TaskStatus.OPEN)
                            .assigneeId(dto.getAssigneeId())
                            .dueDate(dto.getDueDate())
                            .createdBy(userId)
                            .project(project)
                            .build();
                    task = taskRepository.save(task);
                    taskService.notifyTaskCreated(task, userId);
                    return ResponseEntity.status(201).body(task);
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/{id}")
    public ResponseEntity<Task> update(@PathVariable Long id,
                                       @Valid @RequestBody TaskDto dto,
                                       Authentication auth) {
        Long userId = (Long) auth.getPrincipal();
        Task updated = Task.builder()
                .title(dto.getTitle())
                .description(dto.getDescription())
                .status(dto.getStatus())
                .assigneeId(dto.getAssigneeId())
                .dueDate(dto.getDueDate())
                .build();
        Task saved = taskService.updateTask(id, updated, userId);
        return ResponseEntity.ok(saved);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        if (!taskRepository.existsById(id)) return ResponseEntity.notFound().build();
        taskRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    @Data
    public static class TaskDto {
        private Long projectId;
        @NotBlank private String title;
        private String description;
        private Task.TaskStatus status;
        private Long assigneeId;
        private Instant dueDate;
    }
}
