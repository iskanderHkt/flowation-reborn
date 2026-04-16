package kg.ademity.flowation_api_modulith.batch.port;

import kg.ademity.flowation_api_modulith.execution.dto.ExecutionResultResponse;

import java.util.Map;
import java.util.Set;
import java.util.UUID;

public interface OperationExecutionPort {
    ExecutionResultResponse execute(UUID operationId, UUID environmentId, Map<String, Object> inputVariables);
    String getOperationName(UUID operationId);

    Map<UUID, String> getOperationNames(Set<UUID> ids);
}
