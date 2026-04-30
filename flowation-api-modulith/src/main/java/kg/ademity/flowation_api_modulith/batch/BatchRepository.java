package kg.ademity.flowation_api_modulith.batch;

import org.springframework.data.repository.CrudRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface BatchRepository extends CrudRepository<Batch, UUID> {
    List<Batch> findAllByOwnerIdAndDeletedAtIsNullOrderByCreatedAtDesc(UUID ownerId);

    Optional<Batch> findByIdAndDeletedAtIsNull(UUID id);
}
