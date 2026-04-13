package kg.ademity.flowation_api_modulith.catalog.config;

import kg.ademity.flowation_api_modulith.catalog.OperationType;
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
