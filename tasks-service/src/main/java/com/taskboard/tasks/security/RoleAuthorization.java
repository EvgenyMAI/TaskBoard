package com.taskboard.tasks.security;

import org.springframework.security.core.Authentication;

import java.util.Locale;

public final class RoleAuthorization {

    private RoleAuthorization() {}

    public static Long userId(Authentication auth) {
        Object principal = auth.getPrincipal();
        if (principal instanceof Long id) return id;
        return null;
    }

    public static boolean hasRole(Authentication auth, String role) {
        if (auth == null || auth.getAuthorities() == null || role == null) return false;
        String expected = "ROLE_" + role.trim().toUpperCase(Locale.ROOT);
        return auth.getAuthorities().stream()
                .anyMatch(a -> expected.equals(a.getAuthority()));
    }

    public static boolean isAdminOrManager(Authentication auth) {
        return hasRole(auth, "ADMIN") || hasRole(auth, "MANAGER");
    }

    public static boolean isExecutor(Authentication auth) {
        return hasRole(auth, "EXECUTOR");
    }
}

