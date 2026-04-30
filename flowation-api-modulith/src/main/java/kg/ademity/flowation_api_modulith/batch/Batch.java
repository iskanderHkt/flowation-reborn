package kg.ademity.flowation_api_modulith.batch;

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
@Table("batches")
public class Batch {
    @Id
    private UUID id;
    private UUID ownerId;
    private String name;
    private BatchMode mode;
    private Instant createdAt;
    private Instant updatedAt;
    private Instant deletedAt;
}
