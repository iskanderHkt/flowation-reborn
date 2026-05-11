package kg.ademity.flowation_api_modulith.batch.run;

import kg.ademity.flowation_api_modulith.batch.BatchItemType;
import kg.ademity.flowation_api_modulith.batch.port.FlowExecutionPort;
import kg.ademity.flowation_api_modulith.batch.port.OperationExecutionPort;
import kg.ademity.flowation_api_modulith.batch.run.dto.BatchItemCompletedEvent;
import kg.ademity.flowation_api_modulith.batch.run.dto.BatchRunCompletedEvent;
import kg.ademity.flowation_api_modulith.execution.run.ExecutionRun;
import kg.ademity.flowation_api_modulith.execution.run.ExecutionRunRepository;
import kg.ademity.flowation_api_modulith.execution.run.ExecutionStatus;
import kg.ademity.flowation_api_modulith.shared.exception.NotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.time.Duration;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicBoolean;

@Slf4j
@Service
@RequiredArgsConstructor
public class BatchRunStreamService {

    private static final long POLL_INTERVAL_MS = 300;
    private static final int HEARTBEAT_EVERY_N_POLLS = 50;
    private static final long SSE_TIMEOUT_MS = 300_000L;

    private final BatchRunRepository batchRunRepository;
    private final ExecutionRunRepository executionRunRepository;
    private final FlowExecutionPort flowExecutionPort;
    private final OperationExecutionPort operationExecutionPort;

    public SseEmitter stream(UUID batchId, UUID runId) {
        BatchRun run = batchRunRepository.findById(runId)
                .filter(r -> r.getBatchId().equals(batchId))
                .orElseThrow(() -> new NotFoundException("BatchRun not found: " + runId));

        SseEmitter emitter = new SseEmitter(SSE_TIMEOUT_MS);
        AtomicBoolean active = new AtomicBoolean(true);

        emitter.onCompletion(() -> active.set(false));
        emitter.onTimeout(() -> active.set(false));
        emitter.onError(e -> active.set(false));

        Thread.ofVirtual().start(() -> poll(emitter, batchId, runId, run, active));

        return emitter;
    }

    private void poll(SseEmitter emitter, UUID batchId, UUID runId, BatchRun initialRun, AtomicBoolean active) {
        Set<UUID> sentRunIds = new HashSet<>();
        int heartbeatTick = 0;

        try {
            if (isTerminal(initialRun.getStatus())) {
                replayItems(emitter, runId, sentRunIds);
                sendRunCompleted(emitter, initialRun, batchId);
                emitter.complete();
                return;
            }

            while (active.get()) {
                List<ExecutionRun> allItems = executionRunRepository.findAllByBatchGroupIdOrderByCreatedAtAsc(runId);
                for (ExecutionRun item : allItems) {
                    if (isTerminalExecution(item.getStatus()) && !sentRunIds.contains(item.getId())) {
                        emitter.send(SseEmitter.event()
                                .name("item-completed")
                                .data(toItemEvent(item)));
                        sentRunIds.add(item.getId());
                    }
                }

                BatchRun run = batchRunRepository.findById(runId)
                        .orElseThrow(() -> new NotFoundException("BatchRun not found: " + runId));

                if (isTerminal(run.getStatus())) {
                    // Final flush for any items saved in the same transaction as status update
                    List<ExecutionRun> finalItems = executionRunRepository.findAllByBatchGroupIdOrderByCreatedAtAsc(runId);
                    for (ExecutionRun item : finalItems) {
                        if (isTerminalExecution(item.getStatus()) && !sentRunIds.contains(item.getId())) {
                            emitter.send(SseEmitter.event()
                                    .name("item-completed")
                                    .data(toItemEvent(item)));
                        }
                    }
                    sendRunCompleted(emitter, run, batchId);
                    emitter.complete();
                    return;
                }

                heartbeatTick++;
                if (heartbeatTick >= HEARTBEAT_EVERY_N_POLLS) {
                    emitter.send(SseEmitter.event().comment("heartbeat"));
                    heartbeatTick = 0;
                }

                Thread.sleep(POLL_INTERVAL_MS);
            }
        } catch (IOException e) {
            log.debug("[SSE-BATCH] client disconnected for run {}", runId);
            active.set(false);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            log.debug("[SSE-BATCH] polling thread interrupted for run {}", runId);
        } catch (Exception e) {
            log.error("[SSE-BATCH] unexpected error for run {}: {}", runId, e.getMessage(), e);
            try {
                emitter.completeWithError(e);
            } catch (Exception ignored) {}
        }
    }

    private void replayItems(SseEmitter emitter, UUID runId, Set<UUID> sentRunIds) throws IOException {
        List<ExecutionRun> items = executionRunRepository.findAllByBatchGroupIdOrderByCreatedAtAsc(runId);
        for (ExecutionRun item : items) {
            if (isTerminalExecution(item.getStatus())) {
                emitter.send(SseEmitter.event()
                        .name("item-completed")
                        .data(toItemEvent(item)));
                sentRunIds.add(item.getId());
            }
        }
    }

    private void sendRunCompleted(SseEmitter emitter, BatchRun run, UUID batchId) throws IOException {
        emitter.send(SseEmitter.event()
                .name("run-completed")
                .data(new BatchRunCompletedEvent(run.getId(), batchId, run.getStatus())));
    }

    private BatchItemCompletedEvent toItemEvent(ExecutionRun item) {
        boolean isFlow = item.getFlowId() != null;
        UUID referenceId = isFlow ? item.getFlowId() : item.getOperationId();
        BatchItemType itemType = isFlow ? BatchItemType.FLOW : BatchItemType.OPERATION;
        String name = isFlow
                ? flowExecutionPort.getFlowName(referenceId)
                : operationExecutionPort.getOperationName(referenceId);
        Integer durationMs = null;
        if (item.getStartedAt() != null && item.getCompletedAt() != null) {
            durationMs = (int) Duration.between(item.getStartedAt(), item.getCompletedAt()).toMillis();
        }
        return new BatchItemCompletedEvent(itemType, referenceId, name, item.getId(), item.getStatus(), durationMs);
    }

    private boolean isTerminal(BatchRunStatus status) {
        return status == BatchRunStatus.COMPLETED
                || status == BatchRunStatus.FAILED
                || status == BatchRunStatus.PARTIAL;
    }

    private boolean isTerminalExecution(ExecutionStatus status) {
        return status == ExecutionStatus.COMPLETED || status == ExecutionStatus.FAILED;
    }
}
