package kg.ademity.flowation_api_modulith.scheduling.dto;

import kg.ademity.flowation_api_modulith.scheduling.ScheduleStatus;
import kg.ademity.flowation_api_modulith.scheduling.TargetType;

import java.time.Instant;
import java.util.UUID;

public record ScheduleResponse(
        UUID id,
        TargetType targetType,
        UUID targetId,
        String targetName,
        UUID environmentId,
        String cronExpression,
        ScheduleStatus status,
        String description,
        Instant nextFireTime,
        Instant createdAt,
        Instant updatedAt
) {}
