package kg.ademity.flowation_api_modulith.catalog.config;

import kg.ademity.flowation_api_modulith.catalog.OperationType;
import lombok.Data;

import java.util.Map;

@Data
public final class HttpOperationConfig implements OperationConfig {
    private String method;
    private String url;
    private Map<String, String> headers;
    private String body;
    private Integer timeoutMs;
    private boolean failOnHttpError = false;

    @Override
    public OperationType type() {
        return OperationType.HTTP_REQUEST;
    }
}
