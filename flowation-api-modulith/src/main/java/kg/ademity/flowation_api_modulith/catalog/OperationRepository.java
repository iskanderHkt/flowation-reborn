package kg.ademity.flowation_api_modulith.catalog;


import org.springframework.data.repository.CrudRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface OperationRepository extends CrudRepository<Operation, UUID> {

    List<Operation> findAllByOwnerIdAndDeletedAtIsNull(UUID ownerId);

    Optional<Operation> findByIdAndDeletedAtIsNull(UUID id);

}
