package kg.ademity.flowation_api_modulith.execution.dto;

import java.util.Map;
import java.util.UUID;

public record AsyncExecutionRequest(
        UUID environmentId,
        Map<String, Object> inputVariables
) {
    public AsyncExecutionRequest {
        if (inputVariables == null) inputVariables = Map.of();
    }
}
