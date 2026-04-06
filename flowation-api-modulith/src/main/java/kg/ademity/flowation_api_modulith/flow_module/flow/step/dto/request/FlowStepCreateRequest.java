package kg.ademity.flowation_api_modulith.flow_module.flow.step.dto.request;

import kg.ademity.flowation_api_modulith.flow_module.flow.step.Binding;
import kg.ademity.flowation_api_modulith.flow_module.flow.step.OnFailStrategy;
import kg.ademity.flowation_api_modulith.flow_module.flow.step.StepKind;
import kg.ademity.flowation_api_modulith.flow_module.operation.config.OperationConfig;

import java.util.UUID;

public record FlowStepCreateRequest(
        StepKind stepKind,
        Binding binding,
        // LINKED
        UUID operationId,
        OperationConfig configOverride,
        // DETACHED
        OperationConfig ownConfig,
        UUID sourceOperationId,
        // FLOW_STEP
        UUID nestedFlowId,
        // behaviour
        OnFailStrategy onFail
) {
}
