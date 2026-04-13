package kg.ademity.flowation_api_modulith.flow.step.dto.request;

import kg.ademity.flowation_api_modulith.flow.step.Binding;
import kg.ademity.flowation_api_modulith.flow.step.OnFailStrategy;
import kg.ademity.flowation_api_modulith.flow.step.StepKind;
import kg.ademity.flowation_api_modulith.catalog.config.OperationConfig;

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
