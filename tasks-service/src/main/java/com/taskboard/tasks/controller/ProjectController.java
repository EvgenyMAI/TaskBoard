package com.taskboard.tasks.controller;

import com.taskboard.tasks.entity.Project;
import com.taskboard.tasks.repository.ProjectRepository;
import com.taskboard.tasks.entity.ProjectMember;
import com.taskboard.tasks.entity.ProjectMemberId;
import com.taskboard.tasks.repository.ProjectMemberRepository;
import com.taskboard.tasks.security.RoleAuthorization;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

import java.util.List;
import java.util.Objects;

@RestController
@RequestMapping("/api/projects")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class ProjectController {

    private final ProjectRepository projectRepository;
    private final ProjectMemberRepository projectMemberRepository;

    @GetMapping
    public List<Project> list(Authentication auth) {
        boolean isExecutor = RoleAuthorization.isExecutor(auth);
        if (isExecutor) {
            Long userId = RoleAuthorization.userId(auth);
            List<Long> allowedProjectIds = projectMemberRepository.findProjectIdsByUserId(userId);
            if (allowedProjectIds == null || allowedProjectIds.isEmpty()) return List.of();
            return projectRepository.findAllById(allowedProjectIds);
        }
        return projectRepository.findAll();
    }

    @GetMapping("/{id}")
    public ResponseEntity<Project> get(@PathVariable Long id, Authentication auth) {
        boolean isExecutor = RoleAuthorization.isExecutor(auth);
        Long userId = RoleAuthorization.userId(auth);
        Project p = projectRepository.findById(id).orElse(null);
        if (p == null) return ResponseEntity.notFound().build();
        if (isExecutor) {
            boolean member = projectMemberRepository.existsByIdProjectIdAndIdUserId(id, userId);
            if (!member) {
                return ResponseEntity.notFound().build();
            }
        }
        return ResponseEntity.ok(p);
    }

    @PostMapping
    public ResponseEntity<Project> create(@Valid @RequestBody ProjectDto dto, Authentication auth) {
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

        // Создатель проекта автоматически становится участником проекта.
        if (project.getId() != null) {
            ProjectMember member = ProjectMember.builder()
                    .id(new ProjectMemberId(project.getId(), userId))
                    .project(project)
                    .build();
            projectMemberRepository.save(member);
        }
        return ResponseEntity.status(201).body(project);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Project> update(@PathVariable Long id,
                                           @Valid @RequestBody ProjectDto dto,
                                           Authentication auth) {
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

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id, Authentication auth) {
        Long userId = RoleAuthorization.userId(auth);
        boolean isAdminOrManager = RoleAuthorization.isAdminOrManager(auth);
        if (!projectRepository.existsById(id)) return ResponseEntity.notFound().build();
        Project p = projectRepository.findById(id).orElse(null);
        if (p == null) return ResponseEntity.notFound().build();

        if (!isAdminOrManager && !Objects.equals(p.getCreatedBy(), userId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        projectRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{id}/members")
    public ResponseEntity<List<Long>> listMembers(@PathVariable Long id, Authentication auth) {
        Long userId = RoleAuthorization.userId(auth);
        boolean isExecutor = RoleAuthorization.isExecutor(auth);
        boolean isAdminOrManager = RoleAuthorization.isAdminOrManager(auth);

        if (isExecutor && !isAdminOrManager) {
            boolean member = projectMemberRepository.existsByIdProjectIdAndIdUserId(id, userId);
            if (!member) return ResponseEntity.notFound().build();
        }

        List<Long> userIds = projectMemberRepository.findUserIdsByProjectId(id);
        return ResponseEntity.ok(userIds == null ? List.of() : userIds);
    }

    @PostMapping("/{id}/members")
    public ResponseEntity<Void> addMember(@PathVariable Long id,
                                          @Valid @RequestBody MemberRequest request,
                                          Authentication auth) {
        Long actorId = RoleAuthorization.userId(auth);
        boolean isAdminOrManager = RoleAuthorization.isAdminOrManager(auth);

        Project project = projectRepository.findById(id).orElse(null);
        if (project == null) return ResponseEntity.notFound().build();

        boolean isProjectOwner = Objects.equals(project.getCreatedBy(), actorId);
        if (!isAdminOrManager && !isProjectOwner) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        Long targetUserId = request.getUserId();
        if (targetUserId == null) return ResponseEntity.badRequest().build();

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

    @DeleteMapping("/{id}/members/{userId}")
    public ResponseEntity<Void> removeMember(@PathVariable Long id,
                                               @PathVariable Long userId,
                                               Authentication auth) {
        Long actorId = RoleAuthorization.userId(auth);
        boolean isAdminOrManager = RoleAuthorization.isAdminOrManager(auth);

        Project project = projectRepository.findById(id).orElse(null);
        if (project == null) return ResponseEntity.notFound().build();

        boolean isProjectOwner = Objects.equals(project.getCreatedBy(), actorId);
        if (!isAdminOrManager && !isProjectOwner) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        // Не даём убрать создателя проекта (иначе проект может остаться без владельца).
        if (Objects.equals(project.getCreatedBy(), userId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        if (projectMemberRepository.existsByIdProjectIdAndIdUserId(id, userId)) {
            projectMemberRepository.deleteById(new ProjectMemberId(id, userId));
        }
        return ResponseEntity.noContent().build();
    }

    @Data
    public static class ProjectDto {
        @NotBlank private String name;
        private String description;
    }

    @Data
    public static class MemberRequest {
        @jakarta.validation.constraints.NotNull
        private Long userId;
    }
}
