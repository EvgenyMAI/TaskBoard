package com.taskboard.tasks.service;

import com.taskboard.tasks.dto.ProjectMemberRequestDto;
import com.taskboard.tasks.dto.ProjectWriteDto;
import com.taskboard.tasks.entity.Project;
import com.taskboard.tasks.entity.ProjectMember;
import com.taskboard.tasks.entity.ProjectMemberId;
import com.taskboard.tasks.repository.ProjectMemberRepository;
import com.taskboard.tasks.repository.ProjectRepository;
import com.taskboard.tasks.security.RoleAuthorization;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Objects;

@Service
@RequiredArgsConstructor
public class ProjectCommandService {

    private final ProjectRepository projectRepository;
    private final ProjectMemberRepository projectMemberRepository;

    @Transactional
    public ResponseEntity<Project> create(ProjectWriteDto dto, Authentication auth) {
        Long userId = (Long) auth.getPrincipal();
        boolean isAdminOrManager = RoleAuthorization.isAdminOrManager(auth);
        if (!isAdminOrManager) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        Project project = Project.builder()
                .name(dto.getName())
                .description(dto.getDescription())
                .createdBy(userId)
                .build();
        project = projectRepository.save(project);

        if (project.getId() != null) {
            ProjectMember member = ProjectMember.builder()
                    .id(new ProjectMemberId(project.getId(), userId))
                    .project(project)
                    .build();
            projectMemberRepository.save(member);
        }
        return ResponseEntity.status(201).body(project);
    }

    @Transactional
    public ResponseEntity<Project> update(Long id, ProjectWriteDto dto, Authentication auth) {
        Long userId = RoleAuthorization.userId(auth);
        boolean isAdminOrManager = RoleAuthorization.isAdminOrManager(auth);
        return projectRepository.findById(id)
                .map(p -> {
                    if (!isAdminOrManager && !Objects.equals(p.getCreatedBy(), userId)) {
                        return ResponseEntity.status(HttpStatus.FORBIDDEN).<Project>build();
                    }
                    p.setName(dto.getName());
                    p.setDescription(dto.getDescription());
                    return ResponseEntity.ok(projectRepository.save(p));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @Transactional
    public ResponseEntity<Void> delete(Long id, Authentication auth) {
        Long userId = RoleAuthorization.userId(auth);
        boolean isAdminOrManager = RoleAuthorization.isAdminOrManager(auth);
        if (!projectRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        Project p = projectRepository.findById(id).orElse(null);
        if (p == null) {
            return ResponseEntity.notFound().build();
        }

        if (!isAdminOrManager && !Objects.equals(p.getCreatedBy(), userId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        projectRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    @Transactional
    public ResponseEntity<Void> addMember(Long id, ProjectMemberRequestDto request, Authentication auth) {
        Long actorId = RoleAuthorization.userId(auth);
        boolean isAdminOrManager = RoleAuthorization.isAdminOrManager(auth);

        Project project = projectRepository.findById(id).orElse(null);
        if (project == null) {
            return ResponseEntity.notFound().build();
        }

        boolean isProjectOwner = Objects.equals(project.getCreatedBy(), actorId);
        if (!isAdminOrManager && !isProjectOwner) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        Long targetUserId = request.getUserId();
        if (targetUserId == null) {
            return ResponseEntity.badRequest().build();
        }

        boolean exists = projectMemberRepository.existsByIdProjectIdAndIdUserId(id, targetUserId);
        if (!exists) {
            ProjectMember member = ProjectMember.builder()
                    .id(new ProjectMemberId(id, targetUserId))
                    .project(project)
                    .build();
            projectMemberRepository.save(member);
        }

        return ResponseEntity.status(201).build();
    }

    @Transactional
    public ResponseEntity<Void> removeMember(Long id, Long userId, Authentication auth) {
        Long actorId = RoleAuthorization.userId(auth);
        boolean isAdminOrManager = RoleAuthorization.isAdminOrManager(auth);

        Project project = projectRepository.findById(id).orElse(null);
        if (project == null) {
            return ResponseEntity.notFound().build();
        }

        boolean isProjectOwner = Objects.equals(project.getCreatedBy(), actorId);
        if (!isAdminOrManager && !isProjectOwner) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        if (Objects.equals(project.getCreatedBy(), userId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        if (projectMemberRepository.existsByIdProjectIdAndIdUserId(id, userId)) {
            projectMemberRepository.deleteById(new ProjectMemberId(id, userId));
        }
        return ResponseEntity.noContent().build();
    }
}
