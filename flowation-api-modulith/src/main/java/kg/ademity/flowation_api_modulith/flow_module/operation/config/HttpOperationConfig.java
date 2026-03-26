package kg.ademity.flowation_api_modulith.flow_module.operation.config;

import kg.ademity.flowation_api_modulith.flow_module.operation.OperationType;
import lombok.Data;

import java.util.Map;

@Data
public final class HttpOperationConfig implements OperationConfig {
    private String method;
    private String url;
    private Map<String, String> headers;
    private String body;
    private Integer timeoutMs;

    @Override
    public OperationType type() {
        return OperationType.HTTP_REQUEST;
    }
}
