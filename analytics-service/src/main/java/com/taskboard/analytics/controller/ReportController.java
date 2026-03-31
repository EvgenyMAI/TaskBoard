package com.taskboard.analytics.controller;

import com.taskboard.analytics.dto.ReportDto;
import com.taskboard.analytics.service.ReportAggregationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import jakarta.servlet.http.HttpServletRequest;

import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
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
    private static final DateTimeFormatter RU_DATE_TIME = DateTimeFormatter.ofPattern("dd.MM.yyyy HH:mm:ss");

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
        Object breakdownObj = summary.getOrDefault("statusBreakdown", Map.of());
        @SuppressWarnings("unchecked")
        Map<String, Object> statusBreakdown = (Map<String, Object>) breakdownObj;
        @SuppressWarnings("unchecked")
        java.util.List<Map<String, Object>> byProject = (java.util.List<Map<String, Object>>) summary.getOrDefault("byProject", java.util.List.of());
        @SuppressWarnings("unchecked")
        java.util.List<Map<String, Object>> byAssignee = (java.util.List<Map<String, Object>>) summary.getOrDefault("byAssignee", java.util.List.of());
        StringBuilder csv = new StringBuilder();
        csv.append('\uFEFF'); // UTF-8 BOM for correct Excel Cyrillic rendering
        csv.append(csvRow("Отчет", "TaskBoard Analytics"));
        csv.append(csvRow("Сформирован", formatInstant(String.valueOf(summary.getOrDefault("generatedAt", Instant.now().toString())))));
        if (summary.get("from") != null || summary.get("to") != null) {
            csv.append(csvRow("Период",
                    formatInstant(String.valueOf(summary.getOrDefault("from", "—")))
                            + " .. " +
                            formatInstant(String.valueOf(summary.getOrDefault("to", "—")))));
        }
        csv.append('\n');
        csv.append("Показатель;Значение\n");
        csv.append(csvRow("Всего задач", summary.getOrDefault("totalTasks", 0)));
        csv.append(csvRow("Просрочено", summary.getOrDefault("overdueCount", 0)));
        csv.append(csvRow("Активные", summary.getOrDefault("activeCount", 0)));
        csv.append(csvRow("Выполнено", summary.getOrDefault("doneCount", 0)));
        csv.append(csvRow("Completion rate (%)", summary.getOrDefault("completionRate", 0)));
        csv.append(csvRow("Без исполнителя", summary.getOrDefault("withoutAssigneeCount", 0)));
        csv.append('\n');

        csv.append("Статусы;Количество\n");
        for (Map.Entry<String, Object> e : statusBreakdown.entrySet()) {
            csv.append(csvRow(statusLabelRu(e.getKey()), e.getValue()));
        }
        csv.append('\n');

        csv.append("Проект;Количество задач\n");
        for (Map<String, Object> row : byProject) {
            csv.append(csvRow(row.getOrDefault("projectName", "—"), row.getOrDefault("count", 0)));
        }
        csv.append('\n');

        csv.append("Исполнитель;Количество задач\n");
        for (Map<String, Object> row : byAssignee) {
            csv.append(csvRow(row.getOrDefault("username", "—"), row.getOrDefault("count", 0)));
        }
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"taskboard-analytics.csv\"")
                .body(csv.toString());
    }

    private Instant parseInstant(String value) {
        if (value == null || value.isBlank()) return null;
        try {
            return Instant.parse(value);
        } catch (DateTimeParseException ex) {
            return null;
        }
    }

    private String statusLabelRu(String status) {
        if (status == null) return "—";
        return switch (status) {
            case "OPEN" -> "Открыта";
            case "IN_PROGRESS" -> "В работе";
            case "REVIEW" -> "На проверке";
            case "DONE" -> "Выполнена";
            case "CANCELLED" -> "Отменена";
            default -> status;
        };
    }

    private String csvRow(Object left, Object right) {
        return csvCell(left) + ";" + csvCell(right) + "\n";
    }

    private String csvCell(Object value) {
        String s = String.valueOf(value == null ? "" : value);
        if (s.contains("\"")) s = s.replace("\"", "\"\"");
        if (s.contains(";") || s.contains("\n") || s.contains("\r")) {
            s = "\"" + s + "\"";
        }
        return s;
    }

    private String formatInstant(String value) {
        if (value == null || value.isBlank() || "—".equals(value)) return "—";
        try {
            return RU_DATE_TIME.format(Instant.parse(value).atZone(ZoneId.systemDefault()));
        } catch (Exception ignored) {
            return value;
        }
    }
}
