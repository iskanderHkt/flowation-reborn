package kg.ademity.flowation_api_modulith.flow.step.dto.request;

import kg.ademity.flowation_api_modulith.flow.step.Binding;
import kg.ademity.flowation_api_modulith.flow.step.OnFailStrategy;
import kg.ademity.flowation_api_modulith.flow.step.StepKind;
import kg.ademity.flowation_api_modulith.catalog.config.OperationConfig;

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
