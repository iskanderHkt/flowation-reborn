package kg.ademity.flowation_api_modulith.execution.run;

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
@Table("execution_step_results")
public class ExecutionStepResult {
    @Id
    private UUID id;
    private UUID executionRunId;
    private Integer stepIndex;
    private UUID stepRefId;
    private ExecutionStatus status;
    private Map<String, Object> requestSnapshot;
    private Map<String, Object> responseSnapshot;
    private String errorMessage;
    private Integer durationMs;
    private Instant startedAt;
    private Instant completedAt;
}
