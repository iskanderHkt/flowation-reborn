package kg.ademity.flowation_api_modulith.environment;

import org.springframework.data.repository.CrudRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface EnvironmentRepository extends CrudRepository<Environment, UUID> {
    List<Environment> findAllByOwnerIdAndDeletedAtIsNull(UUID ownerId);

    Optional<Environment> findByIdAndDeletedAtIsNull(UUID id);
}
