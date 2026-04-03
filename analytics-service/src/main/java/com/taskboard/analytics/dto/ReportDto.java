package com.taskboard.analytics.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

/**
 * Ответ API отчётов: тип отчёта, агрегаты (структура зависит от {@code reportType}), время генерации.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ReportDto {

    private String reportType;
    private Map<String, Object> aggregates;
    private String generatedAt;
}
