package kg.ademity.flowation_api_modulith.execution_module.run;

import org.springframework.data.repository.CrudRepository;

import java.util.Optional;
import java.util.UUID;

public interface ExecutionStepResultRepository extends CrudRepository<ExecutionStepResult, UUID> {
    Optional<ExecutionStepResult> findByExecutionRunId(UUID executionRunId);
}
