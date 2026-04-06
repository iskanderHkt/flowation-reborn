package kg.ademity.flowation_api_modulith.execution_module.flow;

import kg.ademity.flowation_api_modulith.flow_module.flow.step.OnFailStrategy;
import kg.ademity.flowation_api_modulith.flow_module.flow.step.extraction.ExtractionRule;
import kg.ademity.flowation_api_modulith.flow_module.operation.OperationType;
import kg.ademity.flowation_api_modulith.flow_module.operation.config.OperationConfig;

import java.util.List;
import java.util.UUID;

public record CompiledStep(
        int stepIndex,
        UUID stepRefId,
        String operationName,
        OperationType operationType,
        OperationConfig mergedConfig,
        OnFailStrategy onFail,
        List<ExtractionRule> extractionRules
) {
}
