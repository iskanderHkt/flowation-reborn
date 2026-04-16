package kg.ademity.flowation_api_modulith.batch.dto;

import kg.ademity.flowation_api_modulith.batch.BatchItemType;

import java.util.UUID;

public record BatchItemRequest(BatchItemType itemType, UUID referenceId) {}
