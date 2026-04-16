package kg.ademity.flowation_api_modulith.batch.dto;

import kg.ademity.flowation_api_modulith.batch.BatchMode;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record BatchResponse(
        UUID id,
        String name,
        BatchMode mode,
        List<BatchItemEntry> items,
        List<BatchDataRowEntry> dataRows,
        Instant createdAt,
        Instant updatedAt
) {}
