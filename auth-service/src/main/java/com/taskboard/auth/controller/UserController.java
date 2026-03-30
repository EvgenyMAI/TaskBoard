package com.taskboard.auth.controller;

import com.taskboard.auth.dto.UserSummaryDto;
import com.taskboard.auth.entity.User;
import com.taskboard.auth.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.stream.Collectors;
import java.util.List;
import java.util.Set;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class UserController {

    private final UserRepository userRepository;

    @GetMapping
    public ResponseEntity<List<UserSummaryDto>> list() {
        List<UserSummaryDto> list = userRepository.findAll().stream()
                .map(UserController::toSummary)
                .toList();
        return ResponseEntity.ok(list);
    }

    private static UserSummaryDto toSummary(User u) {
        Set<String> roles = u.getRoles().stream()
                .map(r -> r.getName().name())
                .collect(Collectors.toSet());
        return new UserSummaryDto(u.getId(), u.getUsername(), roles);
    }
}
