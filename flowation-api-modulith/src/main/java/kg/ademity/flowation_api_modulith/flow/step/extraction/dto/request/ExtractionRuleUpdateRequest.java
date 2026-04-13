package kg.ademity.flowation_api_modulith.flow.step.extraction.dto.request;

public record ExtractionRuleUpdateRequest(
        String sourcePath,
        String targetVariable
) {
}
