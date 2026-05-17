package kg.ademity.flowation_api_modulith.scheduling;

import lombok.Builder;
import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.relational.core.mapping.Table;

import java.time.Instant;
import java.util.UUID;

@Data
@Builder
@Table("schedules")
public class Schedule {

    @Id
    private UUID id;

    private UUID ownerId;
    private TargetType targetType;
    private UUID targetId;
    private UUID environmentId;
    private String cronExpression;
    private ScheduleStatus status;
    private String description;
    private Instant createdAt;
    private Instant updatedAt;
}
