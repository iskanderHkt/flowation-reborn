package kg.ademity.flowation_api_modulith.execution_module.dto;

import kg.ademity.flowation_api_modulith.execution_module.run.ExecutionStatus;
import kg.ademity.flowation_api_modulith.execution_module.run.RunMode;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

public record ExecutionResultResponse(
        UUID runId,
        UUID operationId,
        RunMode runMode,
        ExecutionStatus status,
        Instant startedAt,
        Instant completedAt,
        int durationMs,
        Map<String, Object> requestSnapshot,
        Map<String, Object> responseSnapshot,
        String errorMessage
) {}
