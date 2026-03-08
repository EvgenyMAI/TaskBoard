package com.taskboard.analytics.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

/**
 * Placeholder DTO for report data.
 * In full implementation, analytics-service would call tasks-service (or read from shared DB/events)
 * to compute aggregates.
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
