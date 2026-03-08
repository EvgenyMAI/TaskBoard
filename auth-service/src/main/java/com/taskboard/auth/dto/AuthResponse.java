package com.taskboard.auth.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Set;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AuthResponse {

    private String accessToken;
    @Builder.Default
    private String tokenType = "Bearer";
    private Long userId;
    private String username;
    private Set<String> roles;

    public static AuthResponse of(String accessToken, Long userId, String username, Set<String> roles) {
        return AuthResponse.builder()
                .accessToken(accessToken)
                .userId(userId)
                .username(username)
                .roles(roles)
                .build();
    }
}
