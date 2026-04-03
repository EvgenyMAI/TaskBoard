package com.taskboard.tasks.service;

import com.taskboard.tasks.entity.Project;
import com.taskboard.tasks.repository.ProjectMemberRepository;
import com.taskboard.tasks.repository.ProjectRepository;
import com.taskboard.tasks.security.RoleAuthorization;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ProjectQueryService {

    private final ProjectRepository projectRepository;
    private final ProjectMemberRepository projectMemberRepository;

    public List<Project> list(Authentication auth) {
        boolean isExecutor = RoleAuthorization.isExecutor(auth);
        if (isExecutor) {
            Long userId = RoleAuthorization.userId(auth);
            List<Long> allowedProjectIds = projectMemberRepository.findProjectIdsByUserId(userId);
            if (allowedProjectIds == null || allowedProjectIds.isEmpty()) {
                return List.of();
            }
            return projectRepository.findAllById(allowedProjectIds);
        }
        return projectRepository.findAll();
    }

    public ResponseEntity<Project> get(Long id, Authentication auth) {
        boolean isExecutor = RoleAuthorization.isExecutor(auth);
        Long userId = RoleAuthorization.userId(auth);
        Project p = projectRepository.findById(id).orElse(null);
        if (p == null) {
            return ResponseEntity.notFound().build();
        }
        if (isExecutor) {
            boolean member = projectMemberRepository.existsByIdProjectIdAndIdUserId(id, userId);
            if (!member) {
                return ResponseEntity.notFound().build();
            }
        }
        return ResponseEntity.ok(p);
    }

    public ResponseEntity<List<Long>> listMembers(Long id, Authentication auth) {
        Long userId = RoleAuthorization.userId(auth);
        boolean isExecutor = RoleAuthorization.isExecutor(auth);
        boolean isAdminOrManager = RoleAuthorization.isAdminOrManager(auth);

        if (isExecutor && !isAdminOrManager) {
            boolean member = projectMemberRepository.existsByIdProjectIdAndIdUserId(id, userId);
            if (!member) {
                return ResponseEntity.notFound().build();
            }
        }

        List<Long> userIds = projectMemberRepository.findUserIdsByProjectId(id);
        return ResponseEntity.ok(userIds == null ? List.of() : userIds);
    }
}
