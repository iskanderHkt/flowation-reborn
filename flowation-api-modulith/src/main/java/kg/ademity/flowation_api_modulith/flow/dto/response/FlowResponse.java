package kg.ademity.flowation_api_modulith.flow.dto.response;

import kg.ademity.flowation_api_modulith.flow.Flow;

import java.time.Instant;
import java.util.UUID;

public record FlowResponse(
        UUID id,
        String name,
        String description,
        Instant createdAt,
        Instant updatedAt
) {
    public static FlowResponse from(Flow flow) {
        return new FlowResponse(
                flow.getId(),
                flow.getName(),
                flow.getDescription(),
                flow.getCreatedAt(),
                flow.getUpdatedAt()
        );
    }
}
