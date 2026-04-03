package com.taskboard.common.jwt;

import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.junit.jupiter.api.Test;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class ResourceServerJwtParserTest {

    private static final String SECRET = "taskboard-auth-secret-key-min-256-bits-for-hs256";

    @Test
    void validatesAndReadsClaims() {
        SecretKey key = Keys.hmacShaKeyFor(SECRET.getBytes(StandardCharsets.UTF_8));
        String token = Jwts.builder()
                .claim("userId", 42L)
                .claim("roles", List.of("EXECUTOR"))
                .issuedAt(Date.from(Instant.now()))
                .signWith(key)
                .compact();

        ResourceServerJwtParser parser = new ResourceServerJwtParser(SECRET);
        assertTrue(parser.validateToken(token));
        assertEquals(42L, parser.getUserIdFromToken(token));
        assertEquals(List.of("EXECUTOR"), parser.getRolesFromToken(token));
    }

    @Test
    void rejectsGarbageToken() {
        ResourceServerJwtParser parser = new ResourceServerJwtParser(SECRET);
        assertFalse(parser.validateToken("not-a-jwt"));
    }
}
