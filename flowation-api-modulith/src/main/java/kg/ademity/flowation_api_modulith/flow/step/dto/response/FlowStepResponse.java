package kg.ademity.flowation_api_modulith.flow.step.dto.response;

import kg.ademity.flowation_api_modulith.flow.step.Binding;
import kg.ademity.flowation_api_modulith.flow.step.FlowStep;
import kg.ademity.flowation_api_modulith.flow.step.OnFailStrategy;
import kg.ademity.flowation_api_modulith.flow.step.StepKind;
import kg.ademity.flowation_api_modulith.catalog.config.OperationConfig;

import java.util.UUID;

public record FlowStepResponse(
        UUID id,
        UUID flowId,
        Integer stepOrder,
        StepKind stepKind,
        Binding binding,
        UUID operationId,
        OperationConfig configOverride,
        OperationConfig ownConfig,
        UUID sourceOperationId,
        UUID nestedFlowId,
        OnFailStrategy onFail
) {
    public static FlowStepResponse from(FlowStep step) {
        return new FlowStepResponse(
                step.getId(),
                step.getFlowId(),
                step.getStepOrder(),
                step.getStepKind(),
                step.getBinding(),
                step.getOperationId(),
                step.getConfigOverride(),
                step.getOwnConfig(),
                step.getSourceOperationId(),
                step.getNestedFlowId(),
                step.getOnFail()
        );
    }
}
