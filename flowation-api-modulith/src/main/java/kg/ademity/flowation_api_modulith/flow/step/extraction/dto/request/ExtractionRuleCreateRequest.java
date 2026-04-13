package kg.ademity.flowation_api_modulith.flow.step.extraction.dto.request;

public record ExtractionRuleCreateRequest(
        String sourcePath,
        String targetVariable
) {
}
