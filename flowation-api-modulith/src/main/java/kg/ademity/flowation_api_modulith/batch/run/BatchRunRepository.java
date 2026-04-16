package kg.ademity.flowation_api_modulith.batch.run;

import org.springframework.data.domain.Pageable;
import org.springframework.data.repository.CrudRepository;

import java.util.List;
import java.util.UUID;

public interface BatchRunRepository extends CrudRepository<BatchRun, UUID> {
    List<BatchRun> findAllByBatchIdOrderByCreatedAtDesc(UUID batchId, Pageable pageable);
    long countByBatchId(UUID batchId);
}
