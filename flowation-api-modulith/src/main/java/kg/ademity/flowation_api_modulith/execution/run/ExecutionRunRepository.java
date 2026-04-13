package kg.ademity.flowation_api_modulith.execution.run;

import org.springframework.data.repository.CrudRepository;

import java.util.List;
import java.util.UUID;

public interface ExecutionRunRepository extends CrudRepository<ExecutionRun, UUID> {
    List<ExecutionRun> findAllByOperationIdOrderByCreatedAtDesc(UUID operationId);
    List<ExecutionRun> findAllByFlowIdOrderByCreatedAtDesc(UUID flowId);
}
