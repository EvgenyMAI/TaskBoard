package com.taskboard.analytics.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.taskboard.analytics.integration.TasksReportIntegrationClient;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;
import java.util.Map;

/**
 * Сводный отчёт: загрузка данных из других сервисов и расчёт агрегатов.
 */
@Service
@RequiredArgsConstructor
public class ReportAggregationService {

    private final TasksReportIntegrationClient integrationClient;
    private final ReportStatsCalculator statsCalculator;

    public Map<String, Object> buildSummary(String bearerToken, Instant from, Instant to) {
        List<JsonNode> tasks = integrationClient.loadTasksInPeriod(bearerToken, from, to);
        Map<Long, String> projectNames = integrationClient.loadProjectNames(bearerToken);
        Map<Long, String> userNames = integrationClient.loadUserNames(bearerToken);
        Map<String, Object> result = statsCalculator.aggregate(tasks, projectNames, userNames);
        result.put("generatedAt", Instant.now().toString());
        if (from != null) {
            result.put("from", from.toString());
        }
        if (to != null) {
            result.put("to", to.toString());
        }

        if (from != null && to != null && to.isAfter(from)) {
            Instant previousFrom = from.minusSeconds(to.getEpochSecond() - from.getEpochSecond());
            Instant previousTo = from;
            List<JsonNode> previousTasks = integrationClient.loadTasksInPeriod(bearerToken, previousFrom, previousTo);
            Map<String, Object> prev = statsCalculator.aggregate(previousTasks, projectNames, userNames);
            result.put("periodComparison", statsCalculator.buildPeriodComparison(result, prev, from, to, previousFrom, previousTo));
        }
        return result;
    }
}
