package kg.ademity.flowation_api_modulith.batch.port;

import kg.ademity.flowation_api_modulith.execution.dto.FlowExecutionResultResponse;

import java.util.Map;
import java.util.Set;
import java.util.UUID;

public interface FlowExecutionPort {
    FlowExecutionResultResponse execute(UUID flowId, UUID environmentId, Map<String, Object> inputVariables);
    String getFlowName(UUID flowId);

    Map<UUID, String> getFlowNames(Set<UUID> ids);
}
