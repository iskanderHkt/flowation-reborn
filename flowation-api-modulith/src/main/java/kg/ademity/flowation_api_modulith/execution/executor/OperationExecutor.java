package kg.ademity.flowation_api_modulith.execution.executor;

import kg.ademity.flowation_api_modulith.catalog.OperationType;
import kg.ademity.flowation_api_modulith.catalog.config.OperationConfig;

import java.util.Map;

public interface OperationExecutor<T extends OperationConfig> {

    boolean supports(OperationType type);

    StepResult execute(T config, Map<String, Object> context);

    @SuppressWarnings("unchecked")
    default StepResult executeRaw(OperationConfig config, Map<String, Object> context) {
        return execute((T) config, context);
    }
}
