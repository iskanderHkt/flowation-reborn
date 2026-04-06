package kg.ademity.flowation_api_modulith.execution_module.dto;

import kg.ademity.flowation_api_modulith.execution_module.run.ExecutionStatus;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

public record StepResultResponse(
        int stepIndex,
        UUID stepRefId,
        ExecutionStatus status,
        Map<String, Object> requestSnapshot,
        Map<String, Object> responseSnapshot,
        String errorMessage,
        Integer durationMs,
        Instant startedAt,
        Instant completedAt
) {
}
