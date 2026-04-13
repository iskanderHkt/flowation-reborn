package kg.ademity.flowation_api_modulith.execution.executor;

import kg.ademity.flowation_api_modulith.execution.run.ExecutionStatus;

import java.util.Map;

public record StepResult(
        ExecutionStatus status,
        Map<String, Object> requestSnapshot,
        Map<String, Object> responseSnapshot,
        String errorMessage,
        int durationMs
) {
    public static StepResult success(Map<String, Object> request, Map<String, Object> response, int durationMs) {
        return new StepResult(ExecutionStatus.COMPLETED, request, response, null, durationMs);
    }

    public static StepResult failure(Map<String, Object> request, String errorMessage, int durationMs) {
        return new StepResult(ExecutionStatus.FAILED, request, null, errorMessage, durationMs);
    }

    public static StepResult failure(Map<String, Object> request, Map<String, Object> response, String errorMessage, int durationMs) {
        return new StepResult(ExecutionStatus.FAILED, request, response, errorMessage, durationMs);
    }
}
