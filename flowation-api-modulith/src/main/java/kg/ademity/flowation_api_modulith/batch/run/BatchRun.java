package kg.ademity.flowation_api_modulith.batch.run;

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
@Table("batch_runs")
public class BatchRun {
    @Id
    private UUID id;
    private UUID batchId;
    private UUID ownerId;
    private BatchRunStatus status;
    private Instant startedAt;
    private Instant completedAt;
    private Instant createdAt;
}
