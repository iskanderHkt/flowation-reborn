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
}
