package kg.ademity.flowation_api_modulith.batch.dto;

import java.util.Map;
import java.util.UUID;

public record BatchDataRowEntry(UUID id, int rowOrder, Map<String, Object> variables) {}
