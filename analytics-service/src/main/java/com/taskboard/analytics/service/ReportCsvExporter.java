package com.taskboard.analytics.service;

import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;

/**
 * Формирование CSV-отчёта по агрегатам summary (UTF-8 BOM для Excel).
 */
@Service
public class ReportCsvExporter {

    private static final DateTimeFormatter RU_DATE_TIME = DateTimeFormatter.ofPattern("dd.MM.yyyy HH:mm:ss");

    @SuppressWarnings("unchecked")
    public String buildAnalyticsCsv(Map<String, Object> summary) {
        Object breakdownObj = summary.getOrDefault("statusBreakdown", Map.of());
        Map<String, Object> statusBreakdown = (Map<String, Object>) breakdownObj;
        List<Map<String, Object>> byProject = (List<Map<String, Object>>) summary.getOrDefault("byProject", List.of());
        List<Map<String, Object>> byAssignee = (List<Map<String, Object>>) summary.getOrDefault("byAssignee", List.of());

        StringBuilder csv = new StringBuilder();
        csv.append('\uFEFF');
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
        return csv.toString();
    }

    private static String statusLabelRu(String status) {
        if (status == null) {
            return "—";
        }
        return switch (status) {
            case "OPEN" -> "Открыта";
            case "IN_PROGRESS" -> "В работе";
            case "REVIEW" -> "На проверке";
            case "DONE" -> "Выполнена";
            case "CANCELLED" -> "Отменена";
            default -> status;
        };
    }

    private static String csvRow(Object left, Object right) {
        return csvCell(left) + ";" + csvCell(right) + "\n";
    }

    private static String csvCell(Object value) {
        String s = String.valueOf(value == null ? "" : value);
        if (s.contains("\"")) {
            s = s.replace("\"", "\"\"");
        }
        if (s.contains(";") || s.contains("\n") || s.contains("\r")) {
            s = "\"" + s + "\"";
        }
        return s;
    }

    private static String formatInstant(String value) {
        if (value == null || value.isBlank() || "—".equals(value)) {
            return "—";
        }
        try {
            return RU_DATE_TIME.format(Instant.parse(value).atZone(ZoneId.systemDefault()));
        } catch (Exception ignored) {
            return value;
        }
    }
}
