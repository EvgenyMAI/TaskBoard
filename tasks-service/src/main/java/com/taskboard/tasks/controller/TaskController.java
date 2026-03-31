package com.taskboard.tasks.controller;

import com.taskboard.tasks.entity.Task;
import com.taskboard.tasks.entity.Project;
import com.taskboard.tasks.repository.ProjectMemberRepository;
import com.taskboard.tasks.repository.ProjectRepository;
import com.taskboard.tasks.repository.TaskRepository;
import com.taskboard.tasks.service.TaskService;
import com.taskboard.tasks.security.RoleAuthorization;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
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
    private final ProjectMemberRepository projectMemberRepository;

    @GetMapping
    public ResponseEntity<?> list(
            @RequestParam(required = false) Long projectId,
            @RequestParam(required = false) Task.TaskStatus status,
            @RequestParam(required = false) Long assigneeId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            Authentication auth
    ) {
        Long userId = RoleAuthorization.userId(auth);
        boolean isExecutor = RoleAuthorization.isExecutor(auth);
        var pageable = PageRequest.of(page, size);

        if (isExecutor) {
            List<Long> allowedProjectIds = projectMemberRepository.findProjectIdsByUserId(userId);
            if (allowedProjectIds == null || allowedProjectIds.isEmpty()) {
                return ResponseEntity.ok(Page.empty(pageable));
            }

            // Внутри доступных проектов EXECUTOR видит задачи всех пользователей.
            if (projectId != null) {
                if (!allowedProjectIds.contains(projectId)) {
                    return ResponseEntity.ok(Page.empty(pageable));
                }
                Page<Task> result = taskRepository.findByProjectAndFilters(projectId, status, assigneeId, pageable);
                return ResponseEntity.ok(result);
            }

            // Если фильтр по проекту не выбран — показываем задачи во всех проектах, где есть назначенные ему задачи.
            Page<Task> result = taskRepository.findByProjectIdsAndFilters(allowedProjectIds, status, assigneeId, pageable);
            return ResponseEntity.ok(result);
        }

        if (projectId != null) {
            Page<Task> result = taskRepository.findByProjectAndFilters(projectId, status, assigneeId, pageable);
            return ResponseEntity.ok(result);
        }
        if (assigneeId != null) {
            return ResponseEntity.ok(taskRepository.findByAssigneeId(assigneeId));
        }
        return ResponseEntity.ok(taskRepository.findAll(pageable));
    }

    @GetMapping("/{id}")
    public ResponseEntity<Task> get(@PathVariable Long id, Authentication auth) {
        Long userId = RoleAuthorization.userId(auth);
        boolean isExecutor = RoleAuthorization.isExecutor(auth);

        return taskRepository.findByIdWithProject(id)
                .map(task -> {
                    if (isExecutor) {
                        Long taskProjectId = task.getProjectId();
                        if (taskProjectId == null || !projectMemberRepository.existsByIdProjectIdAndIdUserId(taskProjectId, userId)) {
                            return ResponseEntity.status(HttpStatus.NOT_FOUND).<Task>build();
                        }
                    }
                    return ResponseEntity.ok(task);
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<Task> create(@Valid @RequestBody TaskDto dto, Authentication auth) {
        Long userId = (Long) auth.getPrincipal();
        boolean isExecutor = RoleAuthorization.isExecutor(auth);
        Long safeAssigneeId = isExecutor ? userId : dto.getAssigneeId();

        Project project = projectRepository.findById(dto.getProjectId()).orElse(null);
        if (project == null) return ResponseEntity.notFound().build();

        if (isExecutor) {
            boolean isMember = projectMemberRepository.existsByIdProjectIdAndIdUserId(project.getId(), userId);
            if (!isMember) return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        } else {
            // Для ADMIN/MANAGER: назначать задачу можно только участнику проекта.
            if (dto.getAssigneeId() != null) {
                boolean assigneeIsMember = projectMemberRepository.existsByIdProjectIdAndIdUserId(project.getId(), dto.getAssigneeId());
                if (!assigneeIsMember) return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
            }
        }

        Task task = Task.builder()
                .title(dto.getTitle())
                .description(dto.getDescription())
                .status(dto.getStatus() != null ? dto.getStatus() : Task.TaskStatus.OPEN)
                .assigneeId(safeAssigneeId)
                .dueDate(dto.getDueDate())
                .createdBy(userId)
                .project(project)
                .build();

        task = taskRepository.save(task);
        taskService.notifyTaskCreated(task, userId);
        return ResponseEntity.status(201).body(task);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Task> update(@PathVariable Long id,
                                       @Valid @RequestBody TaskDto dto,
                                       Authentication auth) {
        Long userId = RoleAuthorization.userId(auth);
        boolean isExecutor = RoleAuthorization.isExecutor(auth);

        Task existing = taskRepository.findById(id)
                .orElse(null);
        if (existing == null) return ResponseEntity.notFound().build();

        if (isExecutor) {
            // EXECUTOR может обновлять только задачи, назначенные ему.
            if (existing.getAssigneeId() == null || !existing.getAssigneeId().equals(userId)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
            }
            // EXECUTOR не может пере назначать задачу на другого пользователя.
            dto.setAssigneeId(existing.getAssigneeId());
        }

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
    public ResponseEntity<Void> delete(@PathVariable Long id, Authentication auth) {
        Long userId = RoleAuthorization.userId(auth);
        boolean isExecutor = RoleAuthorization.isExecutor(auth);
        if (!taskRepository.existsById(id)) return ResponseEntity.notFound().build();

        // EXECUTOR может удалить только задачи, назначенные ему или им созданные.
        if (isExecutor) {
            Task task = taskRepository.findById(id).orElse(null);
            if (task == null) return ResponseEntity.notFound().build();
            boolean allowed = (task.getAssigneeId() != null && task.getAssigneeId().equals(userId))
                    || (task.getCreatedBy() != null && task.getCreatedBy().equals(userId));
            if (!allowed) return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

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
