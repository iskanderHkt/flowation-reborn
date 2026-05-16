package kg.ademity.flowation_api_modulith.execution.executor;

import kg.ademity.flowation_api_modulith.catalog.OperationType;
import kg.ademity.flowation_api_modulith.execution.exception.StepExecutionException;
import org.springframework.stereotype.Component;

import java.util.EnumMap;
import java.util.List;
import java.util.Map;

@Component
public class OperationExecutorRegistry {

    private final Map<OperationType, OperationExecutor> registry;

    public OperationExecutorRegistry(List<OperationExecutor> executors) {
        registry = new EnumMap<>(OperationType.class);
        for (OperationType type : OperationType.values()) {
            executors.stream()
                    .filter(e -> e.supports(type))
                    .findFirst()
                    .ifPresent(e -> registry.put(type, e));
        }
    }

    public OperationExecutor get(OperationType type) {
        OperationExecutor executor = registry.get(type);
        if (executor == null) {
            throw new StepExecutionException("No executor registered for type: " + type);
        }
        return executor;
    }
}
