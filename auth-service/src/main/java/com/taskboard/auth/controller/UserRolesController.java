package com.taskboard.auth.controller;

import com.taskboard.auth.dto.UpdateUserRoleRequest;
import com.taskboard.auth.dto.UserProfileDto;
import com.taskboard.auth.entity.Role;
import com.taskboard.auth.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Set;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@CrossOrigin(origins = "*", maxAge = 3600)
public class UserRolesController {

    private final AuthService authService;

    /**
     * Редактирование ролей доступно только ADMIN.
     */
    @PreAuthorize("hasRole('ADMIN')")
    @PutMapping("/users/{id}/roles")
    public ResponseEntity<UserProfileDto> updateUserRoles(@PathVariable("id") Long targetUserId,
                                                            @Valid @RequestBody UpdateUserRoleRequest request) {
        Set<Role.RoleName> roles = request.getRoles();
        if (roles == null || roles.isEmpty()) {
            return ResponseEntity.badRequest().build();
        }
        // Для UI обычно выбирается ровно одна роль, но сервер допускает несколько.
        UserProfileDto updated = authService.updateUserRoles(targetUserId, roles);
        return ResponseEntity.ok(updated);
    }
}

