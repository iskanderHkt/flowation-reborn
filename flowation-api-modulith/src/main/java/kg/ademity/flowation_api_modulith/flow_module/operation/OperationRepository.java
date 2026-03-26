package kg.ademity.flowation_api_modulith.flow_module.operation;


import org.springframework.data.repository.CrudRepository;

import java.util.List;
import java.util.UUID;

public interface OperationRepository extends CrudRepository<Operation, UUID> {

    List<Operation> findAllByOwnerId(UUID ownerId);

}
