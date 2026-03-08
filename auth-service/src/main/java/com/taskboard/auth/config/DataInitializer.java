package com.taskboard.auth.config;

import com.taskboard.auth.entity.Role;
import com.taskboard.auth.repository.RoleRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class DataInitializer implements CommandLineRunner {

    private final RoleRepository roleRepository;

    @Override
    public void run(String... args) {
        for (Role.RoleName name : Role.RoleName.values()) {
            roleRepository.findByName(name).orElseGet(() -> {
                Role role = roleRepository.save(Role.builder().name(name).build());
                log.info("Created role: {}", name);
                return role;
            });
        }
    }
}
