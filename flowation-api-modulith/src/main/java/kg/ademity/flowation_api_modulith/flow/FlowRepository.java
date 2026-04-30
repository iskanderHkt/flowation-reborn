package kg.ademity.flowation_api_modulith.flow;


import org.springframework.data.repository.CrudRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface FlowRepository extends CrudRepository<Flow, UUID> {
    List<Flow> findAllByOwnerIdAndDeletedAtIsNull(UUID ownerId);

    Optional<Flow> findByIdAndDeletedAtIsNull(UUID id);
}
