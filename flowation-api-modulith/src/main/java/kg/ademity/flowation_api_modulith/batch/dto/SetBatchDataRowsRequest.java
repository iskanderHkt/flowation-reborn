package kg.ademity.flowation_api_modulith.batch.dto;

import java.util.List;
import java.util.Map;

public record SetBatchDataRowsRequest(List<Map<String, Object>> rows) {}
