package kg.ademity.flowation_api_modulith.batch;

import org.springframework.data.repository.CrudRepository;

import java.util.List;
import java.util.UUID;

public interface BatchItemRepository extends CrudRepository<BatchItem, UUID> {
    List<BatchItem> findAllByBatchIdOrderByItemOrder(UUID batchId);
    void deleteAllByBatchId(UUID batchId);
}
