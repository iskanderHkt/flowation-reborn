package kg.ademity.flowation_api_modulith.catalog.dto.response;

import kg.ademity.flowation_api_modulith.catalog.OperationGroup;

import java.time.Instant;
import java.util.UUID;

public record GroupResponse(UUID id, String name, Instant createdAt) {
    public static GroupResponse from(OperationGroup g) {
        return new GroupResponse(g.getId(), g.getName(), g.getCreatedAt());
    }
}
