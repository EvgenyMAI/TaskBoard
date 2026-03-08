package com.taskboard.tasks.logging;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.slf4j.MDC;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.UUID;

@Slf4j
@Component
public class RequestLoggingFilter extends OncePerRequestFilter {

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        long startedAt = System.currentTimeMillis();
        String requestId = UUID.randomUUID().toString().substring(0, 8);
        MDC.put("requestId", requestId);

        try {
            filterChain.doFilter(request, response);
            String userId = extractUserId();
            if (userId != null) MDC.put("userId", userId);

            long elapsed = System.currentTimeMillis() - startedAt;
            log.info("{} {} -> {} ({} ms)", request.getMethod(), request.getRequestURI(), response.getStatus(), elapsed);
        } catch (Exception ex) {
            long elapsed = System.currentTimeMillis() - startedAt;
            log.error("{} {} -> EXCEPTION ({} ms): {}", request.getMethod(), request.getRequestURI(), elapsed, ex.getMessage());
            throw ex;
        } finally {
            MDC.clear();
        }
    }

    private String extractUserId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || auth.getPrincipal() == null) return null;
        Object principal = auth.getPrincipal();
        if (principal instanceof Long userId) {
            return String.valueOf(userId);
        }
        return null;
    }
}
