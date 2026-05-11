package kg.ademity.flowation_api_modulith.batch.run.dto;

import kg.ademity.flowation_api_modulith.batch.run.BatchRunStatus;

import java.util.UUID;

public record BatchRunCompletedEvent(
        UUID runId,
        UUID batchId,
        BatchRunStatus status
) {}
