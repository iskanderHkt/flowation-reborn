package kg.ademity.flowation_api_modulith.environment_module;

import org.springframework.data.repository.CrudRepository;

import java.util.List;
import java.util.UUID;

public interface EnvVariableRepository extends CrudRepository<EnvVariable, UUID> {
    List<EnvVariable> findAllByEnvironmentId(UUID environmentId);
    void deleteAllByEnvironmentId(UUID environmentId);
}
