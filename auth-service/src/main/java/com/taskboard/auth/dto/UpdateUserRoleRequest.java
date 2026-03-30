package com.taskboard.auth.dto;

import com.taskboard.auth.entity.Role;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Set;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class UpdateUserRoleRequest {

    /**
     * Разрешенные значения: ADMIN, MANAGER, EXECUTOR.
     * Для UI предполагается ровно одна роль, но сервер хранит set.
     */
    @NotNull
    private Set<Role.RoleName> roles;
}

