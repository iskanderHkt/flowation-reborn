package kg.ademity.flowation_api_modulith.flow_module.operation.dto.request;

import kg.ademity.flowation_api_modulith.flow_module.operation.config.OperationConfig;

public record OperationUpdateRequest(
        String name,
        OperationConfig config
) {
}
