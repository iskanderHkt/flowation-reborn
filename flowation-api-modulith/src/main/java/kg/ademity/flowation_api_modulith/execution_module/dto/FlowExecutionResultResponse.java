package kg.ademity.flowation_api_modulith.execution_module.dto;

import kg.ademity.flowation_api_modulith.execution_module.run.ExecutionStatus;
import kg.ademity.flowation_api_modulith.execution_module.run.RunMode;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record FlowExecutionResultResponse(
        UUID runId,
        UUID flowId,
        RunMode runMode,
        ExecutionStatus status,
        Instant startedAt,
        Instant completedAt,
        int totalDurationMs,
        List<StepResultResponse> steps
) {
}
