package kg.ademity.flowation_api_modulith.flow_module.operation.config;

import com.fasterxml.jackson.annotation.JsonSubTypes;
import com.fasterxml.jackson.annotation.JsonTypeInfo;
import kg.ademity.flowation_api_modulith.flow_module.operation.OperationType;

@JsonTypeInfo(use = JsonTypeInfo.Id.NAME, property = "type")
@JsonSubTypes({
        @JsonSubTypes.Type(value = HttpOperationConfig.class,      name = "HTTP_REQUEST"),
        @JsonSubTypes.Type(value = SqlOperationConfig.class,       name = "SQL_QUERY"),
        @JsonSubTypes.Type(value = AssertOperationConfig.class,    name = "ASSERTION")
})
public sealed interface OperationConfig permits HttpOperationConfig, SqlOperationConfig, AssertOperationConfig {
    OperationType type();

    static OperationConfig merge(OperationConfig base, OperationConfig override) {
        return switch (base) {
            case HttpOperationConfig b -> {
                HttpOperationConfig o = (HttpOperationConfig) override;

                HttpOperationConfig merged = new HttpOperationConfig();

                merged.setMethod(o.getMethod() != null ? o.getMethod() : b.getMethod());
                merged.setUrl(o.getUrl() != null ? o.getUrl() : b.getUrl());
                merged.setBody(o.getBody() != null ? o.getBody() : b.getBody());
                merged.setTimeoutMs(o.getTimeoutMs() != null ? o.getTimeoutMs() : b.getTimeoutMs());

                if (b.getHeaders() != null || o.getHeaders() != null) {
                    java.util.Map<String, String> headers = new java.util.HashMap<>();
                    if (b.getHeaders() != null) headers.putAll(b.getHeaders());
                    if (o.getHeaders() != null) headers.putAll(o.getHeaders());
                    merged.setHeaders(headers);
                }
                yield merged;
            }
            case SqlOperationConfig b -> {
                SqlOperationConfig o = (SqlOperationConfig) override;

                SqlOperationConfig merged = new SqlOperationConfig();

                merged.setDbType(o.getDbType() != null ? o.getDbType() : b.getDbType());
                merged.setConnectionString(o.getConnectionString() != null ? o.getConnectionString() : b.getConnectionString());
                merged.setQuery(o.getQuery() != null ? o.getQuery() : b.getQuery());

                yield merged;
            }
            case AssertOperationConfig b -> {
                AssertOperationConfig o = (AssertOperationConfig) override;
                AssertOperationConfig merged = new AssertOperationConfig();
                merged.setExpression(o.getExpression() != null ? o.getExpression() : b.getExpression());
                merged.setComparator(o.getComparator() != null ? o.getComparator() : b.getComparator());
                merged.setExpected(o.getExpected() != null ? o.getExpected() : b.getExpected());
                yield merged;
            }
        };
    }
}
