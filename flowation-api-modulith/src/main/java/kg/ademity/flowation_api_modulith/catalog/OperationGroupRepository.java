package kg.ademity.flowation_api_modulith.catalog;

import org.springframework.data.repository.CrudRepository;

import java.util.List;
import java.util.UUID;

public interface OperationGroupRepository extends CrudRepository<OperationGroup, UUID> {
    List<OperationGroup> findAllByOwnerIdOrderByName(UUID ownerId);
}
