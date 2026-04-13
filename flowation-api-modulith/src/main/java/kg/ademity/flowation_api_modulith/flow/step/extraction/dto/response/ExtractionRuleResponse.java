package kg.ademity.flowation_api_modulith.flow.step.extraction.dto.response;

import kg.ademity.flowation_api_modulith.flow.step.extraction.ExtractionRule;

import java.util.UUID;

public record ExtractionRuleResponse(
        UUID id,
        UUID flowStepId,
        String sourcePath,
        String targetVariable,
        Integer ruleOrder
) {
    public static ExtractionRuleResponse from(ExtractionRule rule) {
        return new ExtractionRuleResponse(
                rule.getId(),
                rule.getFlowStepId(),
                rule.getSourcePath(),
                rule.getTargetVariable(),
                rule.getRuleOrder()
        );
    }
}
