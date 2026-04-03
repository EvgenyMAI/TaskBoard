package com.taskboard.tasks.service;

import com.taskboard.tasks.dto.TaskWriteDto;
import com.taskboard.tasks.entity.Project;
import com.taskboard.tasks.entity.Task;
import com.taskboard.tasks.repository.ProjectMemberRepository;
import com.taskboard.tasks.repository.ProjectRepository;
import com.taskboard.tasks.repository.TaskRepository;
import com.taskboard.tasks.security.RoleAuthorization;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class TaskCommandService {

    private final TaskRepository taskRepository;
    private final ProjectRepository projectRepository;
    private final ProjectMemberRepository projectMemberRepository;
    private final TaskService taskService;

    public ResponseEntity<Task> create(TaskWriteDto dto, Authentication auth) {
        Long userId = (Long) auth.getPrincipal();
        boolean isExecutor = RoleAuthorization.isExecutor(auth);
        Long safeAssigneeId = isExecutor ? userId : dto.getAssigneeId();

        Project project = projectRepository.findById(dto.getProjectId()).orElse(null);
        if (project == null) {
            return ResponseEntity.notFound().build();
        }

        if (isExecutor) {
            boolean isMember = projectMemberRepository.existsByIdProjectIdAndIdUserId(project.getId(), userId);
            if (!isMember) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Вы не состоите в этом проекте");
            }
        } else {
            if (dto.getAssigneeId() != null) {
                boolean assigneeIsMember = projectMemberRepository.existsByIdProjectIdAndIdUserId(project.getId(), dto.getAssigneeId());
                if (!assigneeIsMember) {
                    throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Исполнитель должен быть участником проекта");
                }
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

    public ResponseEntity<Task> update(Long id, TaskWriteDto dto, Authentication auth) {
        Long userId = RoleAuthorization.userId(auth);
        boolean isExecutor = RoleAuthorization.isExecutor(auth);

        Task existing = taskRepository.findByIdWithProject(id).orElse(null);
        if (existing == null) {
            return ResponseEntity.notFound().build();
        }

        if (isExecutor) {
            if (existing.getAssigneeId() == null || !existing.getAssigneeId().equals(userId)) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Редактировать можно только задачи, назначенные на вас");
            }
            dto.setAssigneeId(existing.getAssigneeId());
        } else {
            if (dto.getAssigneeId() != null) {
                Long projectId = existing.getProjectId();
                if (projectId == null) {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "У задачи не задан проект");
                }
                boolean assigneeIsMember = projectMemberRepository.existsByIdProjectIdAndIdUserId(projectId, dto.getAssigneeId());
                if (!assigneeIsMember) {
                    throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Исполнитель должен быть участником проекта");
                }
            }
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

    public ResponseEntity<Void> delete(Long id, Authentication auth) {
        Long userId = RoleAuthorization.userId(auth);
        boolean isExecutor = RoleAuthorization.isExecutor(auth);
        Task task = taskRepository.findByIdWithProject(id).orElse(null);
        if (task == null) {
            return ResponseEntity.notFound().build();
        }

        if (isExecutor) {
            boolean allowed = (task.getAssigneeId() != null && task.getAssigneeId().equals(userId))
                    || (task.getCreatedBy() != null && task.getCreatedBy().equals(userId));
            if (!allowed) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
            }
        }

        taskService.notifyTaskDeleted(task, userId);
        taskRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}
