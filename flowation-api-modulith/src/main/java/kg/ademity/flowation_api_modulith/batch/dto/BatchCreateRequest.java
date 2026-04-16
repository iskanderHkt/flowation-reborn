package kg.ademity.flowation_api_modulith.batch.dto;

import kg.ademity.flowation_api_modulith.batch.BatchMode;

public record BatchCreateRequest(String name, BatchMode mode) {}
