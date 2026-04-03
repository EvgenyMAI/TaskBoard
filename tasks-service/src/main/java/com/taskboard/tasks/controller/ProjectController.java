package com.taskboard.tasks.controller;

import com.taskboard.tasks.dto.ProjectMemberRequestDto;
import com.taskboard.tasks.dto.ProjectWriteDto;
import com.taskboard.tasks.entity.Project;
import com.taskboard.tasks.service.ProjectCommandService;
import com.taskboard.tasks.service.ProjectQueryService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/projects")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class ProjectController {

    private final ProjectQueryService projectQueryService;
    private final ProjectCommandService projectCommandService;

    @GetMapping
    public List<Project> list(Authentication auth) {
        return projectQueryService.list(auth);
    }

    @GetMapping("/{id}")
    public ResponseEntity<Project> get(@PathVariable Long id, Authentication auth) {
        return projectQueryService.get(id, auth);
    }

    @PostMapping
    public ResponseEntity<Project> create(@Valid @RequestBody ProjectWriteDto dto, Authentication auth) {
        return projectCommandService.create(dto, auth);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Project> update(@PathVariable Long id,
                                          @Valid @RequestBody ProjectWriteDto dto,
                                          Authentication auth) {
        return projectCommandService.update(id, dto, auth);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id, Authentication auth) {
        return projectCommandService.delete(id, auth);
    }

    @GetMapping("/{id}/members")
    public ResponseEntity<List<Long>> listMembers(@PathVariable Long id, Authentication auth) {
        return projectQueryService.listMembers(id, auth);
    }

    @PostMapping("/{id}/members")
    public ResponseEntity<Void> addMember(@PathVariable Long id,
                                          @Valid @RequestBody ProjectMemberRequestDto request,
                                          Authentication auth) {
        return projectCommandService.addMember(id, request, auth);
    }

    @DeleteMapping("/{id}/members/{userId}")
    public ResponseEntity<Void> removeMember(@PathVariable Long id,
                                             @PathVariable Long userId,
                                             Authentication auth) {
        return projectCommandService.removeMember(id, userId, auth);
    }
}
