package kg.ademity.flowation_api_modulith.catalog.dto.request;

import kg.ademity.flowation_api_modulith.catalog.config.OperationConfig;

import java.util.UUID;

public record OperationUpdateRequest(
        String name,
        OperationConfig config,
        UUID groupId
) {
}
