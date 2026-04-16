package kg.ademity.flowation_api_modulith.batch.dto;

import java.util.List;

public record SetBatchItemsRequest(List<BatchItemRequest> items) {}
