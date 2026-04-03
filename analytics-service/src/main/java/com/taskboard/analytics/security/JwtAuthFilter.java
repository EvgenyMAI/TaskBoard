package com.taskboard.analytics.security;

import com.taskboard.analytics.config.JwtConfig;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;
import java.util.Objects;
import java.util.stream.Collectors;

@RequiredArgsConstructor
public class JwtAuthFilter extends OncePerRequestFilter {

    private final JwtConfig jwtConfig;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        String jwt = getJwtFromRequest(request);
        if (StringUtils.hasText(jwt) && jwtConfig.validateToken(jwt)) {
            Long userId = jwtConfig.getUserIdFromToken(jwt);
            List<String> roles = jwtConfig.getRolesFromToken(jwt);
            List<SimpleGrantedAuthority> authorities;
            if (roles == null || roles.isEmpty()) {
                authorities = List.of(new SimpleGrantedAuthority("ROLE_USER"));
            } else {
                authorities = roles.stream()
                        .filter(Objects::nonNull)
                        .map(String::trim)
                        .filter(s -> !s.isEmpty())
                        .map(role -> "ROLE_" + role)
                        .map(SimpleGrantedAuthority::new)
                        .collect(Collectors.toList());
            }
            UsernamePasswordAuthenticationToken auth =
                    new UsernamePasswordAuthenticationToken(userId, null, authorities);
            SecurityContextHolder.getContext().setAuthentication(auth);
        }
        filterChain.doFilter(request, response);
    }

    private String getJwtFromRequest(HttpServletRequest request) {
        String bearer = request.getHeader("Authorization");
        if (StringUtils.hasText(bearer) && bearer.startsWith("Bearer ")) {
            return bearer.substring(7);
        }
        // EventSource не умеет задавать заголовки Authorization, поэтому разрешаем токен в query-параметре.
        String tokenFromParam = request.getParameter("access_token");
        if (!StringUtils.hasText(tokenFromParam)) {
            tokenFromParam = request.getParameter("token");
        }
        if (StringUtils.hasText(tokenFromParam)) {
            return tokenFromParam.trim();
        }
        return null;
    }
}
