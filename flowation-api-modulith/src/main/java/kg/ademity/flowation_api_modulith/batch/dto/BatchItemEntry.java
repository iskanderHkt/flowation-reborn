package kg.ademity.flowation_api_modulith.batch.dto;

import kg.ademity.flowation_api_modulith.batch.BatchItemType;

import java.util.UUID;

public record BatchItemEntry(UUID id, BatchItemType itemType, UUID referenceId, int itemOrder) {}
