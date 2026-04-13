package kg.ademity.flowation_api_modulith.environment;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.relational.core.mapping.Table;

import java.time.Instant;
import java.util.UUID;

@Data
@Builder
@AllArgsConstructor
@Table("environments")
public class Environment {
    @Id
    private UUID id;
    private UUID ownerId;
    private String name;
    private Instant createdAt;
    private Instant updatedAt;
}
