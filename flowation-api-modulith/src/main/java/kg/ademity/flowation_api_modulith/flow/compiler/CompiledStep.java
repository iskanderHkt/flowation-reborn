package kg.ademity.flowation_api_modulith.flow.compiler;

import kg.ademity.flowation_api_modulith.flow.step.OnFailStrategy;
import kg.ademity.flowation_api_modulith.flow.step.extraction.ExtractionRule;
import kg.ademity.flowation_api_modulith.catalog.OperationType;
import kg.ademity.flowation_api_modulith.catalog.config.OperationConfig;

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
