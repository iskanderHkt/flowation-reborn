package kg.ademity.flowation_api_modulith.execution.run;

import org.springframework.data.repository.CrudRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ExecutionStepResultRepository extends CrudRepository<ExecutionStepResult, UUID> {
    Optional<ExecutionStepResult> findByExecutionRunId(UUID executionRunId);
    List<ExecutionStepResult> findAllByExecutionRunIdOrderByStepIndex(UUID executionRunId);
    List<ExecutionStepResult> findAllByExecutionRunIdAndStepIndexGreaterThanOrderByStepIndex(UUID executionRunId, int stepIndex);
}
