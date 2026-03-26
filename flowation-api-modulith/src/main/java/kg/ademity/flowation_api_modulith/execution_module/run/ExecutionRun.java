package kg.ademity.flowation_api_modulith.execution_module.run;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.relational.core.mapping.Table;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

@Data
@Builder
@AllArgsConstructor
@Table("execution_runs")
public class ExecutionRun {
    @Id
    private UUID id;
    private UUID ownerId;
    private RunMode runMode;
    private ExecutionStatus status;
    private UUID operationId;
    private UUID flowId;
    private UUID batchGroupId;
    private UUID environmentId;
    private Map<String, Object> executionPlan;
    private Instant startedAt;
    private Instant completedAt;
    private Instant createdAt;
}
