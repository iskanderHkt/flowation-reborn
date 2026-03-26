package kg.ademity.flowation_api_modulith.execution_module.executor;

import kg.ademity.flowation_api_modulith.flow_module.operation.OperationType;
import kg.ademity.flowation_api_modulith.flow_module.operation.config.OperationConfig;

import java.util.Map;

public interface OperationExecutor {

    boolean supports(OperationType type);

    StepResult execute(OperationConfig config, Map<String, Object> context);
}
