package com.taskboard.analytics.controller;

import com.taskboard.analytics.dto.ReportDto;
import com.taskboard.analytics.service.ReportAggregationService;
import com.taskboard.analytics.service.ReportCsvExporter;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import jakarta.servlet.http.HttpServletRequest;

import java.time.Instant;
import java.time.format.DateTimeParseException;
import java.util.Map;

/**
 * Reports API — каркас.
 * В полной реализации: вызов tasks-service или общая БД для агрегатов (количество по проекту, по исполнителю, просроченные, среднее время).
 */
@RestController
@RequestMapping("/api/reports")
@CrossOrigin(origins = "*")
@RequiredArgsConstructor
public class ReportController {

    private final ReportAggregationService reportAggregationService;
    private final ReportCsvExporter reportCsvExporter;

    @GetMapping("/summary")
    public ResponseEntity<ReportDto> summary(Authentication auth,
                                             HttpServletRequest request,
                                             @RequestParam(value = "from", required = false) String from,
                                             @RequestParam(value = "to", required = false) String to) {
        Instant fromTs = parseInstant(from);
        Instant toTs = parseInstant(to);
        String bearer = request.getHeader("Authorization");
        Map<String, Object> aggregates = reportAggregationService.buildSummary(bearer, fromTs, toTs);
        ReportDto dto = ReportDto.builder()
                .reportType("summary")
                .aggregates(aggregates)
                .generatedAt(Instant.now().toString())
                .build();
        return ResponseEntity.ok(dto);
    }

    @GetMapping("/by-project")
    public ResponseEntity<ReportDto> byProject(Authentication auth,
                                               HttpServletRequest request,
                                               @RequestParam(value = "from", required = false) String from,
                                               @RequestParam(value = "to", required = false) String to) {
        Map<String, Object> summary = reportAggregationService.buildSummary(
                request.getHeader("Authorization"),
                parseInstant(from),
                parseInstant(to)
        );
        ReportDto dto = ReportDto.builder()
                .reportType("by_project")
                .aggregates(Map.of(
                        "byProject", summary.getOrDefault("byProject", java.util.List.of()),
                        "totalTasks", summary.getOrDefault("totalTasks", 0),
                        "generatedAt", summary.getOrDefault("generatedAt", Instant.now().toString())
                ))
                .generatedAt(Instant.now().toString())
                .build();
        return ResponseEntity.ok(dto);
    }

    @GetMapping("/by-assignee")
    public ResponseEntity<ReportDto> byAssignee(Authentication auth,
                                                HttpServletRequest request,
                                                @RequestParam(value = "from", required = false) String from,
                                                @RequestParam(value = "to", required = false) String to) {
        Map<String, Object> summary = reportAggregationService.buildSummary(
                request.getHeader("Authorization"),
                parseInstant(from),
                parseInstant(to)
        );
        ReportDto dto = ReportDto.builder()
                .reportType("by_assignee")
                .aggregates(Map.of(
                        "byAssignee", summary.getOrDefault("byAssignee", java.util.List.of()),
                        "totalTasks", summary.getOrDefault("totalTasks", 0),
                        "generatedAt", summary.getOrDefault("generatedAt", Instant.now().toString())
                ))
                .generatedAt(Instant.now().toString())
                .build();
        return ResponseEntity.ok(dto);
    }

    @GetMapping(value = "/export", produces = "text/csv")
    public ResponseEntity<String> exportCsv(Authentication auth,
                                            HttpServletRequest request,
                                            @RequestParam(value = "from", required = false) String from,
                                            @RequestParam(value = "to", required = false) String to) {
        Map<String, Object> summary = reportAggregationService.buildSummary(
                request.getHeader("Authorization"),
                parseInstant(from),
                parseInstant(to)
        );
        String csv = reportCsvExporter.buildAnalyticsCsv(summary);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"taskboard-analytics.csv\"")
                .body(csv);
    }

    private Instant parseInstant(String value) {
        if (value == null || value.isBlank()) return null;
        try {
            return Instant.parse(value);
        } catch (DateTimeParseException ex) {
            return null;
        }
    }

}
