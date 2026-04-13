package kg.ademity.flowation_api_modulith.catalog.config;

import kg.ademity.flowation_api_modulith.catalog.OperationType;
import lombok.Data;

@Data
public final class AssertOperationConfig implements OperationConfig {
    private String expression;
    private String comparator;  // EQ | NEQ | CONTAINS | REGEX | GT | LT | IS_NULL
    private String expected;

    @Override
    public OperationType type() {
        return OperationType.ASSERTION;
    }
}
