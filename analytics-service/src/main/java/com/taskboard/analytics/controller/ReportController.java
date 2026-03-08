package com.taskboard.analytics.controller;

import com.taskboard.analytics.dto.ReportDto;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.Map;

/**
 * Reports API — каркас.
 * В полной реализации: вызов tasks-service или общая БД для агрегатов (количество по проекту, по исполнителю, просроченные, среднее время).
 */
@RestController
@RequestMapping("/api/reports")
@CrossOrigin(origins = "*")
public class ReportController {

    @GetMapping("/summary")
    public ResponseEntity<ReportDto> summary(Authentication auth) {
        // Placeholder: в реальности запрос к tasks-service или своей БД
        ReportDto dto = ReportDto.builder()
                .reportType("summary")
                .aggregates(Map.of(
                        "totalTasks", 0,
                        "tasksByProject", Map.of(),
                        "overdueCount", 0,
                        "avgCompletionHours", 0.0
                ))
                .generatedAt(Instant.now().toString())
                .build();
        return ResponseEntity.ok(dto);
    }

    @GetMapping("/by-project")
    public ResponseEntity<ReportDto> byProject(Authentication auth) {
        ReportDto dto = ReportDto.builder()
                .reportType("by_project")
                .aggregates(Map.of("projects", Map.of()))
                .generatedAt(Instant.now().toString())
                .build();
        return ResponseEntity.ok(dto);
    }

    @GetMapping("/by-assignee")
    public ResponseEntity<ReportDto> byAssignee(Authentication auth) {
        ReportDto dto = ReportDto.builder()
                .reportType("by_assignee")
                .aggregates(Map.of("assignees", Map.of()))
                .generatedAt(Instant.now().toString())
                .build();
        return ResponseEntity.ok(dto);
    }

    @GetMapping(value = "/export", produces = "text/csv")
    public ResponseEntity<String> exportCsv(Authentication auth) {
        // Placeholder CSV
        String csv = "reportType,generatedAt\nsummary," + Instant.now() + "\n";
        return ResponseEntity.ok(csv);
    }
}
