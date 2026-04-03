package com.taskboard.tasks.service;

import com.taskboard.tasks.entity.Task;
import com.taskboard.tasks.repository.ProjectMemberRepository;
import com.taskboard.tasks.repository.TaskRepository;
import com.taskboard.tasks.security.RoleAuthorization;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * Правила выборки задач с учётом ролей (EXECUTOR видит только свои проекты / членство).
 */
@Service
@RequiredArgsConstructor
public class TaskQueryService {

    private final TaskRepository taskRepository;
    private final ProjectMemberRepository projectMemberRepository;

    public ResponseEntity<?> listTasks(Long projectId,
                                       Task.TaskStatus status,
                                       Long assigneeId,
                                       int page,
                                       int size,
                                       Authentication auth) {
        Long userId = RoleAuthorization.userId(auth);
        boolean isExecutor = RoleAuthorization.isExecutor(auth);
        var pageable = PageRequest.of(page, size);

        if (isExecutor) {
            List<Long> allowedProjectIds = projectMemberRepository.findProjectIdsByUserId(userId);
            if (allowedProjectIds == null || allowedProjectIds.isEmpty()) {
                return ResponseEntity.ok(Page.empty(pageable));
            }

            if (projectId != null) {
                if (!allowedProjectIds.contains(projectId)) {
                    return ResponseEntity.ok(Page.empty(pageable));
                }
                Page<Task> result = taskRepository.findByProjectAndFilters(projectId, status, assigneeId, pageable);
                return ResponseEntity.ok(result);
            }

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

    public ResponseEntity<Task> getTask(Long id, Authentication auth) {
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
}
