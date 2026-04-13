package kg.ademity.flowation_api_modulith.catalog.dto.response;

import kg.ademity.flowation_api_modulith.catalog.Operation;
import kg.ademity.flowation_api_modulith.catalog.OperationType;
import kg.ademity.flowation_api_modulith.catalog.config.OperationConfig;

import java.time.Instant;
import java.util.UUID;

public record OperationResponse(
        UUID id,
        String name,
        OperationType type,
        OperationConfig configTemplate,
        Instant createdAt,
        Instant updatedAt
) {
    public static OperationResponse from(Operation op) {
        return new OperationResponse(
                op.getId(),
                op.getName(),
                op.getType(),
                op.getConfigTemplate(),
                op.getCreatedAt(),
                op.getUpdatedAt()
        );
    }
}
