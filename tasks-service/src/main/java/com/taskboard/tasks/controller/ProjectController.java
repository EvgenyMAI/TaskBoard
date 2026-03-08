package com.taskboard.tasks.controller;

import com.taskboard.tasks.entity.Project;
import com.taskboard.tasks.repository.ProjectRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/projects")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class ProjectController {

    private final ProjectRepository projectRepository;

    @GetMapping
    public List<Project> list() {
        return projectRepository.findAll();
    }

    @GetMapping("/{id}")
    public ResponseEntity<Project> get(@PathVariable Long id) {
        return projectRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<Project> create(@Valid @RequestBody ProjectDto dto, Authentication auth) {
        Long userId = (Long) auth.getPrincipal();
        Project project = Project.builder()
                .name(dto.getName())
                .description(dto.getDescription())
                .createdBy(userId)
                .build();
        project = projectRepository.save(project);
        return ResponseEntity.status(201).body(project);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Project> update(@PathVariable Long id, @Valid @RequestBody ProjectDto dto) {
        return projectRepository.findById(id)
                .map(p -> {
                    p.setName(dto.getName());
                    p.setDescription(dto.getDescription());
                    return ResponseEntity.ok(projectRepository.save(p));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        if (!projectRepository.existsById(id)) return ResponseEntity.notFound().build();
        projectRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    @Data
    public static class ProjectDto {
        @NotBlank private String name;
        private String description;
    }
}
