package kg.ademity.flowation_api_modulith.execution;

import kg.ademity.flowation_api_modulith.catalog.Operation;
import kg.ademity.flowation_api_modulith.execution.dto.ExecutionResultResponse;
import kg.ademity.flowation_api_modulith.execution.exception.StepExecutionException;
import kg.ademity.flowation_api_modulith.execution.executor.OperationExecutor;
import kg.ademity.flowation_api_modulith.execution.executor.StepResult;
import kg.ademity.flowation_api_modulith.execution.port.EnvContextPort;
import kg.ademity.flowation_api_modulith.execution.port.OperationPort;
import kg.ademity.flowation_api_modulith.execution.run.*;
import kg.ademity.flowation_api_modulith.shared.PageResult;
import kg.ademity.flowation_api_modulith.shared.TenantContext;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class InstantExecutionService {

    private final OperationPort operationPort;
    private final EnvContextPort envContextPort;
    private final ExecutionRunRepository executionRunRepository;
    private final ExecutionStepResultRepository stepResultRepository;
    private final List<OperationExecutor> executors;
    private final TenantContext tenantContext;

    public ExecutionResultResponse execute(UUID operationId, UUID environmentId) {
        return execute(operationId, environmentId, Map.of());
    }

    public ExecutionResultResponse execute(UUID operationId, UUID environmentId, Map<String, Object> inputVariables) {
        Operation operation = operationPort.findById(operationId);

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

        // env variables as base, input variables override on top
        Map<String, Object> context = new HashMap<>(envContextPort.loadContext(environmentId));
        context.putAll(inputVariables);

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
            log.error("[INSTANT] {} — unexpected error: {}", operation.getName(), e.getMessage());
        } finally {
            // always finalize run — prevents stuck RUNNING status on unexpected errors
            run.setStatus(finalStatus);
            run.setCompletedAt(Instant.now());
            executionRunRepository.save(run);
        }

        if (finalStatus == ExecutionStatus.COMPLETED) {
            log.info("[INSTANT] {} ({}) → COMPLETED ({}ms)",
                    operation.getName(), operation.getType(), saved != null ? saved.getDurationMs() : 0);
        } else {
            log.warn("[INSTANT] {} ({}) → FAILED: {}",
                    operation.getName(), operation.getType(), saved != null ? saved.getErrorMessage() : "unknown");
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

    public UUID startAsync(UUID operationId, UUID environmentId, Map<String, Object> inputVariables) {
        Operation operation = operationPort.findById(operationId);

        ExecutionRun run = executionRunRepository.save(ExecutionRun.builder()
                .ownerId(tenantContext.getOwnerId())
                .runMode(RunMode.INSTANT)
                .status(ExecutionStatus.PENDING)
                .operationId(operationId)
                .environmentId(environmentId)
                .executionPlan(Map.of("operationId", operationId.toString(), "operationName", operation.getName()))
                .createdAt(Instant.now())
                .build());

        Thread.ofVirtual().start(() -> runAsync(run, operation, environmentId, inputVariables));

        return run.getId();
    }

    private void runAsync(ExecutionRun run, Operation operation, UUID environmentId, Map<String, Object> inputVariables) {
        run.setStatus(ExecutionStatus.RUNNING);
        run.setStartedAt(Instant.now());
        executionRunRepository.save(run);

        OperationExecutor executor = executors.stream()
                .filter(e -> e.supports(operation.getType()))
                .findFirst()
                .orElseThrow(() -> new StepExecutionException("No executor found for type: " + operation.getType()));

        Map<String, Object> context = new HashMap<>(envContextPort.loadContext(environmentId));
        context.putAll(inputVariables);

        ExecutionStatus finalStatus = ExecutionStatus.FAILED;

        try {
            StepResult stepResult = executor.executeRaw(operation.getConfigTemplate(), context);
            Instant completedAt = Instant.now();

            stepResultRepository.save(ExecutionStepResult.builder()
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
                    ? ExecutionStatus.COMPLETED : ExecutionStatus.FAILED;

            if (finalStatus == ExecutionStatus.COMPLETED) {
                log.info("[INSTANT-ASYNC] {} ({}) → COMPLETED ({}ms)",
                        operation.getName(), operation.getType(), stepResult.durationMs());
            } else {
                log.warn("[INSTANT-ASYNC] {} ({}) → FAILED: {}",
                        operation.getName(), operation.getType(), stepResult.errorMessage());
            }
        } catch (Exception e) {
            log.error("[INSTANT-ASYNC] {} — unexpected error: {}", operation.getName(), e.getMessage(), e);
        } finally {
            run.setStatus(finalStatus);
            run.setCompletedAt(Instant.now());
            executionRunRepository.save(run);
        }
    }

    public PageResult<ExecutionResultResponse> getHistory(UUID operationId, int page, int size) {
        var pageable = PageRequest.of(page, size);
        List<ExecutionResultResponse> content = executionRunRepository
                .findAllByOperationIdOrderByCreatedAtDesc(operationId, pageable)
                .stream()
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
        long total = executionRunRepository.countByOperationId(operationId);
        return new PageResult<>(content, total, page, size);
    }
}
