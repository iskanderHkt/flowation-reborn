package kg.ademity.flowation_api_modulith.batch.run;

import kg.ademity.flowation_api_modulith.batch.*;
import kg.ademity.flowation_api_modulith.batch.port.FlowExecutionPort;
import kg.ademity.flowation_api_modulith.batch.port.OperationExecutionPort;
import kg.ademity.flowation_api_modulith.batch.run.dto.BatchRunItemResult;
import kg.ademity.flowation_api_modulith.batch.run.dto.BatchRunResponse;
import kg.ademity.flowation_api_modulith.execution.run.ExecutionRun;
import kg.ademity.flowation_api_modulith.execution.run.ExecutionRunRepository;
import kg.ademity.flowation_api_modulith.execution.run.ExecutionStatus;
import kg.ademity.flowation_api_modulith.shared.TenantContext;
import kg.ademity.flowation_api_modulith.shared.exception.NotFoundException;
import kg.ademity.flowation_api_modulith.shared.exception.ValidationException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import kg.ademity.flowation_api_modulith.shared.PageResult;
import org.springframework.data.domain.PageRequest;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutorService;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class BatchRunService {

    private final BatchRunRepository batchRunRepository;
    private final BatchService batchService;
    private final FlowExecutionPort flowExecutionPort;
    private final OperationExecutionPort operationExecutionPort;
    private final ExecutionRunRepository executionRunRepository;
    private final TenantContext tenantContext;
    private final ExecutorService batchExecutor;

    public BatchRun start(UUID batchId) {
        Batch batch = batchService.findById(batchId);
        List<BatchItem> items = batchService.getItems(batchId);

        if (items.isEmpty()) {
            throw new ValidationException("Batch has no items to execute");
        }

        if (batch.getMode() == BatchMode.DATA_DRIVEN) {
            List<BatchDataRow> dataRows = batchService.getDataRows(batchId);
            if (dataRows.isEmpty()) {
                throw new ValidationException("DATA_DRIVEN batch has no data rows");
            }
        }

        BatchRun run = batchRunRepository.save(BatchRun.builder()
                .batchId(batchId)
                .ownerId(tenantContext.getOwnerId())
                .status(BatchRunStatus.PENDING)
                .createdAt(Instant.now())
                .build());

        CompletableFuture.runAsync(() -> executeAsync(run, batch, items), batchExecutor);

        return run;
    }

    public PageResult<BatchRunResponse> getHistory(UUID batchId, int page, int size) {
        batchService.findById(batchId);
        var pageable = PageRequest.of(page, size);
        List<BatchRunResponse> content = batchRunRepository
                .findAllByBatchIdOrderByCreatedAtDesc(batchId, pageable)
                .stream()
                .map(this::toResponse)
                .toList();
        long total = batchRunRepository.countByBatchId(batchId);
        return new PageResult<>(content, total, page, size);
    }

    public BatchRunResponse getRunById(UUID batchId, UUID runId) {
        batchService.findById(batchId);
        BatchRun run = batchRunRepository.findById(runId)
                .filter(r -> r.getBatchId().equals(batchId))
                .orElseThrow(() -> new NotFoundException("BatchRun not found: " + runId));
        return toResponse(run);
    }

    private void executeAsync(BatchRun run, Batch batch, List<BatchItem> items) {
        run.setStatus(BatchRunStatus.RUNNING);
        run.setStartedAt(Instant.now());
        batchRunRepository.save(run);

        int count = batch.getMode() == BatchMode.MULTI
                ? items.size()
                : batchService.getDataRows(batch.getId()).size();
        log.info("[BATCH] \"{}\" ({}) run={} — {} item(s) starting",
                batch.getName(), batch.getMode(), run.getId().toString().substring(0, 8), count);

        List<CompletableFuture<UUID>> futures = batch.getMode() == BatchMode.MULTI
                ? buildMultiFutures(items, run.getId())
                : buildDataDrivenFutures(items.get(0), batchService.getDataRows(batch.getId()), run.getId());

        List<UUID> executionRunIds = futures.stream()
                .map(CompletableFuture::join)
                .toList();

        BatchRunStatus finalStatus = aggregateStatus(executionRunIds);
        run.setStatus(finalStatus);
        run.setCompletedAt(Instant.now());
        batchRunRepository.save(run);

        long durationMs = java.time.Duration.between(run.getStartedAt(), run.getCompletedAt()).toMillis();
        log.info("[BATCH] \"{}\" run={} → {} ({}ms)",
                batch.getName(), run.getId().toString().substring(0, 8), finalStatus, durationMs);
    }

    // MULTI: each item executes once with empty input variables
    private List<CompletableFuture<UUID>> buildMultiFutures(List<BatchItem> items, UUID batchRunId) {
        return items.stream()
                .map(item -> CompletableFuture.supplyAsync(
                        () -> executeItem(item, null, Map.of(), batchRunId),
                        batchExecutor))
                .toList();
    }

    // DATA_DRIVEN: single item executes once per data row
    private List<CompletableFuture<UUID>> buildDataDrivenFutures(
            BatchItem item, List<BatchDataRow> dataRows, UUID batchRunId) {
        return dataRows.stream()
                .map(row -> CompletableFuture.supplyAsync(
                        () -> executeItem(item, null, row.getVariables(), batchRunId),
                        batchExecutor))
                .toList();
    }

    private UUID executeItem(BatchItem item, UUID environmentId, Map<String, Object> inputVariables, UUID batchRunId) {
        UUID executionRunId;
        ExecutionStatus status;

        if (item.getItemType() == BatchItemType.FLOW) {
            var result = flowExecutionPort.execute(item.getReferenceId(), environmentId, inputVariables);
            executionRunId = result.runId();
            status = result.status();
            log.info("[BATCH]   [FLOW] {} → {}", flowExecutionPort.getFlowName(item.getReferenceId()), status);
        } else {
            var result = operationExecutionPort.execute(item.getReferenceId(), environmentId, inputVariables);
            executionRunId = result.runId();
            status = result.status();
            log.info("[BATCH]   [OP]   {} → {}", operationExecutionPort.getOperationName(item.getReferenceId()), status);
        }

        linkExecutionRun(executionRunId, batchRunId);
        return executionRunId;
    }

    private void linkExecutionRun(UUID executionRunId, UUID batchRunId) {
        executionRunRepository.findById(executionRunId).ifPresent(execRun -> {
            execRun.setBatchGroupId(batchRunId);
            executionRunRepository.save(execRun);
        });
    }

    private BatchRunStatus aggregateStatus(List<UUID> executionRunIds) {
        List<ExecutionRun> runs = executionRunIds.stream()
                .flatMap(id -> executionRunRepository.findById(id).stream())
                .toList();

        long completed = runs.stream().filter(r -> r.getStatus() == ExecutionStatus.COMPLETED).count();
        long failed = runs.stream().filter(r -> r.getStatus() == ExecutionStatus.FAILED).count();

        if (failed == 0) return BatchRunStatus.COMPLETED;
        if (completed == 0) return BatchRunStatus.FAILED;
        return BatchRunStatus.PARTIAL;
    }

    private BatchRunResponse toResponse(BatchRun run) {
        List<ExecutionRun> execRuns = executionRunRepository
                .findAllByBatchGroupIdOrderByCreatedAtAsc(run.getId());

        // Collect unique IDs — one IN-query per type instead of N single-row lookups
        Set<UUID> flowIds = execRuns.stream()
                .filter(er -> er.getFlowId() != null)
                .map(ExecutionRun::getFlowId)
                .collect(Collectors.toSet());
        Set<UUID> operationIds = execRuns.stream()
                .filter(er -> er.getOperationId() != null)
                .map(ExecutionRun::getOperationId)
                .collect(Collectors.toSet());

        Map<UUID, String> flowNames = flowIds.isEmpty() ? Map.of() : flowExecutionPort.getFlowNames(flowIds);
        Map<UUID, String> operationNames = operationIds.isEmpty() ? Map.of() : operationExecutionPort.getOperationNames(operationIds);

        List<BatchRunItemResult> items = execRuns.stream()
                .map(er -> {
                    boolean isFlow = er.getFlowId() != null;
                    UUID referenceId = isFlow ? er.getFlowId() : er.getOperationId();
                    BatchItemType itemType = isFlow ? BatchItemType.FLOW : BatchItemType.OPERATION;
                    String name = isFlow ? flowNames.get(referenceId) : operationNames.get(referenceId);
                    return new BatchRunItemResult(itemType, referenceId, name, er.getId(), er.getStatus(), null);
                })
                .toList();

        return new BatchRunResponse(
                run.getId(),
                run.getBatchId(),
                run.getStatus(),
                run.getStartedAt(),
                run.getCompletedAt(),
                items
        );
    }
}
