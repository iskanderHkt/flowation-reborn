package kg.ademity.flowation_api_modulith.scheduling.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import kg.ademity.flowation_api_modulith.scheduling.TargetType;

import java.util.UUID;

public record ScheduleCreateRequest(
        @NotNull TargetType targetType,
        @NotNull UUID targetId,
        UUID environmentId,
        @NotBlank String cronExpression,
        String description
) {}
