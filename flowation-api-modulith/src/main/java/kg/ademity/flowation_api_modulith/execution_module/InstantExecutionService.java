package kg.ademity.flowation_api_modulith.execution_module;

import kg.ademity.flowation_api_modulith.execution_module.dto.ExecutionResultResponse;
import kg.ademity.flowation_api_modulith.execution_module.executor.OperationExecutor;
import kg.ademity.flowation_api_modulith.execution_module.executor.StepResult;
import kg.ademity.flowation_api_modulith.execution_module.exception.StepExecutionException;
import kg.ademity.flowation_api_modulith.execution_module.run.*;
import kg.ademity.flowation_api_modulith.flow_module.operation.Operation;
import kg.ademity.flowation_api_modulith.flow_module.operation.OperationService;
import kg.ademity.flowation_api_modulith.environment_module.EnvironmentService;
import kg.ademity.flowation_api_modulith.shared.TenantContext;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class InstantExecutionService {

    private final OperationService operationService;
    private final ExecutionRunRepository executionRunRepository;
    private final ExecutionStepResultRepository stepResultRepository;
    private final List<OperationExecutor> executors;
    private final TenantContext tenantContext;
    private final EnvironmentService environmentService;

    public ExecutionResultResponse execute(UUID operationId, UUID environmentId) {
        Operation operation = operationService.findById(operationId);

        ExecutionRun run = executionRunRepository.save(ExecutionRun.builder()
                .ownerId(tenantContext.getOwnerId())
                .runMode(RunMode.INSTANT)
                .status(ExecutionStatus.RUNNING)
                .operationId(operationId)
                .environmentId(environmentId)
                .executionPlan(Map.of("operationId", operationId.toString(), "operationName", operation.getName()))
                .startedAt(Instant.now())
                .createdAt(Instant.now())
                .build());

        OperationExecutor executor = executors.stream()
                .filter(e -> e.supports(operation.getType()))
                .findFirst()
                .orElseThrow(() -> new StepExecutionException("No executor found for type: " + operation.getType()));

        Map<String, Object> context = new HashMap<>();
        if (environmentId != null) {
            context.putAll(environmentService.loadAsContext(environmentId));
        }

        ExecutionStepResult saved = null;
        ExecutionStatus finalStatus = ExecutionStatus.FAILED;
        Instant completedAt;

        try {
            StepResult stepResult = executor.executeRaw(operation.getConfigTemplate(), context);
            completedAt = Instant.now();

            saved = stepResultRepository.save(ExecutionStepResult.builder()
                    .executionRunId(run.getId())
                    .stepIndex(0)
                    .status(stepResult.status())
                    .requestSnapshot(stepResult.requestSnapshot())
                    .responseSnapshot(stepResult.responseSnapshot())
                    .errorMessage(stepResult.errorMessage())
                    .durationMs(stepResult.durationMs())
                    .startedAt(run.getStartedAt())
                    .completedAt(completedAt)
                    .build());

            finalStatus = stepResult.status() == ExecutionStatus.COMPLETED
                    ? ExecutionStatus.COMPLETED
                    : ExecutionStatus.FAILED;
        } catch (Exception e) {
            completedAt = Instant.now();
        } finally {
            // always finalize run — prevents stuck RUNNING status on unexpected errors
            executionRunRepository.save(ExecutionRun.builder()
                    .id(run.getId())
                    .ownerId(run.getOwnerId())
                    .runMode(run.getRunMode())
                    .status(finalStatus)
                    .operationId(operationId)
                    .executionPlan(run.getExecutionPlan())
                    .startedAt(run.getStartedAt())
                    .completedAt(Instant.now())
                    .createdAt(run.getCreatedAt())
                    .build());
        }

        return new ExecutionResultResponse(
                run.getId(),
                operationId,
                RunMode.INSTANT,
                finalStatus,
                run.getStartedAt(),
                completedAt,
                saved != null ? saved.getDurationMs() : 0,
                saved != null ? saved.getRequestSnapshot() : null,
                saved != null ? saved.getResponseSnapshot() : null,
                saved != null ? saved.getErrorMessage() : null
        );
    }

    public List<ExecutionResultResponse> getHistory(UUID operationId) {
        return executionRunRepository.findAllByOperationIdOrderByCreatedAtDesc(operationId).stream()
                .map(run -> {
                    ExecutionStepResult step = stepResultRepository.findByExecutionRunId(run.getId()).orElse(null);
                    return new ExecutionResultResponse(
                            run.getId(),
                            run.getOperationId(),
                            run.getRunMode(),
                            run.getStatus(),
                            run.getStartedAt(),
                            run.getCompletedAt(),
                            step != null ? step.getDurationMs() : 0,
                            step != null ? step.getRequestSnapshot() : null,
                            step != null ? step.getResponseSnapshot() : null,
                            step != null ? step.getErrorMessage() : null
                    );
                })
                .toList();
    }
}
