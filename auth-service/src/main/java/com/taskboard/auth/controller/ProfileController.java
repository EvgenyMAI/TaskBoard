package com.taskboard.auth.controller;

import com.taskboard.auth.dto.ChangePasswordRequest;
import com.taskboard.auth.dto.UpdateProfileRequest;
import com.taskboard.auth.dto.UserProfileDto;
import com.taskboard.auth.security.UserPrincipal;
import com.taskboard.auth.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@CrossOrigin(origins = "*", maxAge = 3600)
public class ProfileController {

    private final AuthService authService;

    @GetMapping("/me")
    public ResponseEntity<UserProfileDto> me(Authentication authentication) {
        Long userId = ((UserPrincipal) authentication.getPrincipal()).getId();
        return ResponseEntity.ok(authService.getProfile(userId));
    }

    @PutMapping("/me")
    public ResponseEntity<UserProfileDto> updateProfile(Authentication authentication,
                                                        @Valid @RequestBody UpdateProfileRequest request) {
        Long userId = ((UserPrincipal) authentication.getPrincipal()).getId();
        return ResponseEntity.ok(authService.updateProfile(userId, request));
    }

    @PutMapping("/me/password")
    public ResponseEntity<Map<String, String>> changePassword(Authentication authentication,
                                                              @Valid @RequestBody ChangePasswordRequest request) {
        Long userId = ((UserPrincipal) authentication.getPrincipal()).getId();
        authService.changePassword(userId, request);
        return ResponseEntity.ok(Map.of("message", "Password changed successfully"));
    }
}
