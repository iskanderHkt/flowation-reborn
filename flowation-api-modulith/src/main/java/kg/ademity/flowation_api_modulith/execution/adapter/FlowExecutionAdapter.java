package kg.ademity.flowation_api_modulith.execution.adapter;

import kg.ademity.flowation_api_modulith.batch.port.FlowExecutionPort;
import kg.ademity.flowation_api_modulith.execution.dto.FlowExecutionResultResponse;
import kg.ademity.flowation_api_modulith.execution.flow.FlowExecutionService;
import kg.ademity.flowation_api_modulith.execution.port.FlowPlanPort;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.Set;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class FlowExecutionAdapter implements FlowExecutionPort {

    private final FlowExecutionService flowExecutionService;
    private final FlowPlanPort flowPlanPort;

    @Override
    public FlowExecutionResultResponse execute(UUID flowId, UUID environmentId, Map<String, Object> inputVariables) {
        return flowExecutionService.execute(flowId, environmentId, inputVariables);
    }

    @Override
    public String getFlowName(UUID flowId) {
        return flowPlanPort.getFlowName(flowId);
    }

    @Override
    public Map<UUID, String> getFlowNames(Set<UUID> ids) {
        return flowPlanPort.getFlowNamesByIds(ids);
    }
}
