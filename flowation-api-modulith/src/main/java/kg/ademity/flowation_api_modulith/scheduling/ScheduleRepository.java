package kg.ademity.flowation_api_modulith.scheduling;

import org.springframework.data.repository.CrudRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ScheduleRepository extends CrudRepository<Schedule, UUID> {

    List<Schedule> findAllByOwnerId(UUID ownerId);

    Optional<Schedule> findByIdAndOwnerId(UUID id, UUID ownerId);
}
