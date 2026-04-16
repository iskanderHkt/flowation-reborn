package kg.ademity.flowation_api_modulith.batch.run.dto;

import kg.ademity.flowation_api_modulith.batch.run.BatchRunStatus;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record BatchRunResponse(
        UUID id,
        UUID batchId,
        BatchRunStatus status,
        Instant startedAt,
        Instant completedAt,
        List<BatchRunItemResult> items
) {}
