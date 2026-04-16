package kg.ademity.flowation_api_modulith.batch.run.dto;

import kg.ademity.flowation_api_modulith.batch.BatchItemType;
import kg.ademity.flowation_api_modulith.execution.run.ExecutionStatus;

import java.util.UUID;

public record BatchRunItemResult(
        BatchItemType itemType,
        UUID referenceId,
        String name,
        UUID executionRunId,
        ExecutionStatus status,
        Integer durationMs
) {}
