package kg.ademity.flowation_api_modulith.scheduling.dto;

import jakarta.validation.constraints.NotBlank;

import java.util.UUID;

public record ScheduleUpdateRequest(
        UUID environmentId,
        @NotBlank String cronExpression,
        String description
) {}
