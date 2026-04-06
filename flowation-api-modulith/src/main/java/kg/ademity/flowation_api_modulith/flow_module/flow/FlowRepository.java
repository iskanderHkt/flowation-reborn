package kg.ademity.flowation_api_modulith.flow_module.flow;


import org.springframework.data.repository.CrudRepository;

import java.util.List;
import java.util.UUID;

public interface FlowRepository extends CrudRepository<Flow, UUID> {
    List<Flow> findAllByOwnerId(UUID ownerId);
}
