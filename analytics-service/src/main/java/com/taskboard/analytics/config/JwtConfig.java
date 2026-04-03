package com.taskboard.analytics.config;

import com.taskboard.common.jwt.ResourceServerJwtParser;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class JwtConfig {

    private final ResourceServerJwtParser parser;

    public JwtConfig(@Value("${app.jwt.secret:taskboard-auth-secret-key-min-256-bits-for-hs256}") String jwtSecret) {
        this.parser = new ResourceServerJwtParser(jwtSecret);
    }

    public boolean validateToken(String token) {
        return parser.validateToken(token);
    }

    public Long getUserIdFromToken(String token) {
        return parser.getUserIdFromToken(token);
    }

    public List<String> getRolesFromToken(String token) {
        return parser.getRolesFromToken(token);
    }
}
