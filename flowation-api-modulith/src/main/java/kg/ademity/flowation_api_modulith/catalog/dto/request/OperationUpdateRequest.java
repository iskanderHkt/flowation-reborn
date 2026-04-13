package kg.ademity.flowation_api_modulith.catalog.dto.request;

import kg.ademity.flowation_api_modulith.catalog.config.OperationConfig;

public record OperationUpdateRequest(
        String name,
        OperationConfig config
) {
}
