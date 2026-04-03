package com.taskboard.analytics.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;

class ReportStatsCalculatorTest {

    private final ObjectMapper objectMapper = new ObjectMapper();
    private final ReportStatsCalculator calculator = new ReportStatsCalculator();

    @Test
    void aggregateCountsStatusesAndCompletionRate() throws Exception {
        JsonNode t1 = objectMapper.readTree("""
                {"status":"OPEN","projectId":1,"assigneeId":10,"dueDate":"2099-01-01T00:00:00Z"}
                """);
        JsonNode t2 = objectMapper.readTree("""
                {"status":"DONE","projectId":1,"assigneeId":10}
                """);
        JsonNode t3 = objectMapper.readTree("""
                {"status":"OPEN","projectId":2}
                """);

        Map<Long, String> projects = Map.of(1L, "P1", 2L, "P2");
        Map<Long, String> users = Map.of(10L, "U10");

        Map<String, Object> out = calculator.aggregate(List.of(t1, t2, t3), projects, users);

        assertEquals(3, out.get("totalTasks"));
        assertEquals(1, out.get("doneCount"));
        assertEquals(2, out.get("activeCount"));
        assertEquals(33.33, (Double) out.get("completionRate"), 0.001);
        assertEquals(1, out.get("withoutAssigneeCount"));

        @SuppressWarnings("unchecked")
        Map<String, Integer> breakdown = (Map<String, Integer>) out.get("statusBreakdown");
        assertEquals(2, breakdown.get("OPEN"));
        assertEquals(1, breakdown.get("DONE"));
    }

    @Test
    void aggregateMarksOverdueNonTerminal() throws Exception {
        Instant overdue = Instant.parse("2000-01-01T00:00:00Z");
        JsonNode openOld = objectMapper.createObjectNode()
                .put("status", "IN_PROGRESS")
                .put("projectId", 1)
                .put("assigneeId", 1)
                .put("dueDate", overdue.toString());

        Map<String, Object> out = calculator.aggregate(
                List.of(openOld),
                Map.of(1L, "P"),
                Map.of(1L, "U"));

        assertEquals(1, out.get("overdueCount"));
    }

    @Test
    void aggregateIgnoresOverdueForDone() throws Exception {
        JsonNode doneOld = objectMapper.createObjectNode()
                .put("status", "DONE")
                .put("projectId", 1)
                .put("assigneeId", 1)
                .put("dueDate", "2000-01-01T00:00:00Z");

        Map<String, Object> out = calculator.aggregate(
                List.of(doneOld),
                Map.of(1L, "P"),
                Map.of(1L, "U"));

        assertEquals(0, out.get("overdueCount"));
    }

    @Test
    void buildPeriodComparisonComputesDeltas() {
        Instant f1 = Instant.parse("2024-02-01T00:00:00Z");
        Instant t1 = Instant.parse("2024-02-28T00:00:00Z");
        Instant f0 = Instant.parse("2024-01-01T00:00:00Z");
        Instant t0 = Instant.parse("2024-01-31T00:00:00Z");

        Map<String, Object> current = Map.of("totalTasks", 10, "overdueCount", 2);
        Map<String, Object> previous = Map.of("totalTasks", 5, "overdueCount", 4);

        Map<String, Object> period = calculator.buildPeriodComparison(current, previous, f1, t1, f0, t0);

        assertEquals(5, period.get("deltaTotal"));
        assertEquals(-2, period.get("deltaOverdue"));
        assertEquals(100.0, (Double) period.get("deltaTotalPercent"), 0.001);
    }

    @Test
    void intValueHandlesNumberAndString() {
        assertEquals(7, ReportStatsCalculator.intValue(7));
        assertEquals(3, ReportStatsCalculator.intValue(3L));
        assertEquals(9, ReportStatsCalculator.intValue("9"));
        assertEquals(0, ReportStatsCalculator.intValue("x"));
        assertEquals(0, ReportStatsCalculator.intValue(null));
    }
}
