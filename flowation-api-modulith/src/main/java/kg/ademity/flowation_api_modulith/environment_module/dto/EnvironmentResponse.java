package kg.ademity.flowation_api_modulith.environment_module.dto;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record EnvironmentResponse(
        UUID id,
        String name,
        List<VariableEntry> variables,
        Instant createdAt,
        Instant updatedAt
) {
    public record VariableEntry(UUID id, String key, String value) {}
}
