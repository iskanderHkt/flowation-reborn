package kg.ademity.flowation_api_modulith.execution.adapter;

import kg.ademity.flowation_api_modulith.batch.port.OperationExecutionPort;
import kg.ademity.flowation_api_modulith.execution.InstantExecutionService;
import kg.ademity.flowation_api_modulith.execution.dto.ExecutionResultResponse;
import kg.ademity.flowation_api_modulith.execution.port.OperationPort;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.Set;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class OperationExecutionAdapter implements OperationExecutionPort {

    private final InstantExecutionService instantExecutionService;
    private final OperationPort operationPort;

    @Override
    public ExecutionResultResponse execute(UUID operationId, UUID environmentId, Map<String, Object> inputVariables) {
        return instantExecutionService.execute(operationId, environmentId, inputVariables);
    }

    @Override
    public String getOperationName(UUID operationId) {
        return operationPort.findById(operationId).getName();
    }

    @Override
    public Map<UUID, String> getOperationNames(Set<UUID> ids) {
        return operationPort.findNamesByIds(ids);
    }
}
