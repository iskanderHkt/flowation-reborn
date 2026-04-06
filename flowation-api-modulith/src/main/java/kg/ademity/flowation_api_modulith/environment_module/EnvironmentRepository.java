package kg.ademity.flowation_api_modulith.environment_module;

import org.springframework.data.repository.CrudRepository;

import java.util.List;
import java.util.UUID;

public interface EnvironmentRepository extends CrudRepository<Environment, UUID> {
    List<Environment> findAllByOwnerId(UUID ownerId);
}
