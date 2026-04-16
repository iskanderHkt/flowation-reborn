package kg.ademity.flowation_api_modulith.batch;

import org.springframework.data.repository.CrudRepository;

import java.util.List;
import java.util.UUID;

public interface BatchDataRowRepository extends CrudRepository<BatchDataRow, UUID> {
    List<BatchDataRow> findAllByBatchIdOrderByRowOrder(UUID batchId);
    void deleteAllByBatchId(UUID batchId);
}
