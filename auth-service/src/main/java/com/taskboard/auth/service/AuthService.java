package com.taskboard.auth.service;

import com.taskboard.auth.dto.AuthResponse;
import com.taskboard.auth.dto.ChangePasswordRequest;
import com.taskboard.auth.dto.LoginRequest;
import com.taskboard.auth.dto.RegisterRequest;
import com.taskboard.auth.dto.UserProfileDto;
import com.taskboard.auth.dto.UpdateProfileRequest;
import com.taskboard.auth.entity.Role;
import com.taskboard.auth.entity.User;
import com.taskboard.auth.repository.RoleRepository;
import com.taskboard.auth.repository.UserRepository;
import com.taskboard.auth.security.JwtTokenProvider;
import com.taskboard.auth.security.UserPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AuthService {
    public static final String PASSWORD_CHANGE_PHRASE = "I_CONFIRM_PASSWORD_CHANGE";

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtTokenProvider tokenProvider;

    public boolean validateToken(String token) {
        return tokenProvider.validateToken(token);
    }

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        if (userRepository.existsByUsername(request.getUsername())) {
            throw new IllegalArgumentException("Username already exists: " + request.getUsername());
        }
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new IllegalArgumentException("Email already registered: " + request.getEmail());
        }

        Role executorRole = roleRepository.findByName(Role.RoleName.EXECUTOR)
                .orElseGet(() -> roleRepository.save(Role.builder().name(Role.RoleName.EXECUTOR).build()));

        User user = User.builder()
                .username(request.getUsername())
                .password(passwordEncoder.encode(request.getPassword()))
                .email(request.getEmail())
                .roles(new HashSet<>(Set.of(executorRole)))
                .enabled(true)
                .build();
        user = userRepository.save(user);

        String token = tokenProvider.generateToken(user.getUsername(), user.getId());
        Set<String> roles = user.getRoles().stream()
                .map(r -> r.getName().name())
                .collect(Collectors.toSet());
        return AuthResponse.of(token, user.getId(), user.getUsername(), roles);
    }

    public AuthResponse login(LoginRequest request) {
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.getUsername(), request.getPassword())
        );
        UserPrincipal principal = (UserPrincipal) authentication.getPrincipal();
        String token = tokenProvider.generateToken(authentication);
        Set<String> roles = principal.getAuthorities().stream()
                .map(a -> a.getAuthority().replace("ROLE_", ""))
                .collect(Collectors.toSet());
        return AuthResponse.of(token, principal.getId(), principal.getUsername(), roles);
    }

    @Transactional(readOnly = true)
    public UserProfileDto getProfile(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found: " + userId));
        return toProfile(user);
    }

    @Transactional
    public UserProfileDto updateProfile(Long userId, UpdateProfileRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found: " + userId));

        String username = request.getUsername().trim();
        String email = request.getEmail().trim();

        userRepository.findByUsername(username)
                .filter(u -> !u.getId().equals(userId))
                .ifPresent(u -> {
                    throw new IllegalArgumentException("Username already exists: " + username);
                });

        userRepository.findByEmail(email)
                .filter(u -> !u.getId().equals(userId))
                .ifPresent(u -> {
                    throw new IllegalArgumentException("Email already registered: " + email);
                });

        user.setUsername(username);
        user.setEmail(email);
        return toProfile(userRepository.save(user));
    }

    @Transactional
    public void changePassword(Long userId, ChangePasswordRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found: " + userId));

        if (!PASSWORD_CHANGE_PHRASE.equals(request.getConfirmationPhrase())) {
            throw new IllegalArgumentException("Invalid confirmation phrase");
        }
        if (!passwordEncoder.matches(request.getCurrentPassword(), user.getPassword())) {
            throw new IllegalArgumentException("Current password is incorrect");
        }
        if (request.getCurrentPassword().equals(request.getNewPassword())) {
            throw new IllegalArgumentException("New password must be different from current password");
        }

        user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(user);
    }

    private UserProfileDto toProfile(User user) {
        Set<String> roles = user.getRoles().stream()
                .map(r -> r.getName().name())
                .collect(Collectors.toSet());
        return UserProfileDto.builder()
                .id(user.getId())
                .username(user.getUsername())
                .email(user.getEmail())
                .roles(roles)
                .build();
    }
}
