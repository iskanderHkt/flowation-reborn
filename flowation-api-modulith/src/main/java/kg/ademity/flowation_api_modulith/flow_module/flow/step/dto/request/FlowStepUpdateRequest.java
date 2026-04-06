package kg.ademity.flowation_api_modulith.flow_module.flow.step.dto.request;

import kg.ademity.flowation_api_modulith.flow_module.flow.step.Binding;
import kg.ademity.flowation_api_modulith.flow_module.flow.step.OnFailStrategy;
import kg.ademity.flowation_api_modulith.flow_module.flow.step.StepKind;
import kg.ademity.flowation_api_modulith.flow_module.operation.config.OperationConfig;

import java.util.UUID;

public record FlowStepUpdateRequest(
        StepKind stepKind,
        Binding binding,
        UUID operationId,
        OperationConfig configOverride,
        OperationConfig ownConfig,
        UUID sourceOperationId,
        UUID nestedFlowId,
        OnFailStrategy onFail
) {
}
