package kg.ademity.flowation_api_modulith.flow_module.operation.config;

import kg.ademity.flowation_api_modulith.flow_module.operation.OperationType;
import lombok.Data;

@Data
public final class SqlOperationConfig implements OperationConfig {
    private String dbType;
    private String connectionString;
    private String query;

    @Override
    public OperationType type() {
        return OperationType.SQL_QUERY;
    }
}
