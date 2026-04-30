package kg.ademity.flowation_api_modulith.execution.dto;

import kg.ademity.flowation_api_modulith.execution.run.ExecutionStatus;

import java.time.Instant;
import java.util.UUID;

public record RunCompletedEvent(
        UUID runId,
        ExecutionStatus status,
        int totalDurationMs,
        Instant completedAt
) {}
