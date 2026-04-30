package kg.ademity.flowation_api_modulith.execution.stream;

import kg.ademity.flowation_api_modulith.execution.dto.RunCompletedEvent;
import kg.ademity.flowation_api_modulith.execution.dto.StepProgressEvent;
import kg.ademity.flowation_api_modulith.execution.run.ExecutionRun;
import kg.ademity.flowation_api_modulith.execution.run.ExecutionRunRepository;
import kg.ademity.flowation_api_modulith.execution.run.ExecutionStatus;
import kg.ademity.flowation_api_modulith.execution.run.ExecutionStepResult;
import kg.ademity.flowation_api_modulith.execution.run.ExecutionStepResultRepository;
import kg.ademity.flowation_api_modulith.shared.exception.NotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.time.Duration;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicBoolean;

@Slf4j
@Service
@RequiredArgsConstructor
public class ExecutionStreamService {

    // Poll interval for new steps and run status (ms)
    private static final long POLL_INTERVAL_MS = 300;

    // Heartbeat every N polls to keep the connection alive (N * POLL_INTERVAL_MS = interval)
    private static final int HEARTBEAT_EVERY_N_POLLS = 50; // ~15 seconds

    // SSE connection lifetime (ms)
    private static final long SSE_TIMEOUT_MS = 300_000L; // 5 minutes

    private final ExecutionRunRepository runRepository;
    private final ExecutionStepResultRepository stepResultRepository;

    public SseEmitter stream(UUID runId) {
        ExecutionRun run = runRepository.findById(runId)
                .orElseThrow(() -> new NotFoundException("Execution run not found: " + runId));

        SseEmitter emitter = new SseEmitter(SSE_TIMEOUT_MS);
        AtomicBoolean active = new AtomicBoolean(true);

        emitter.onCompletion(() -> active.set(false));
        emitter.onTimeout(() -> active.set(false));
        emitter.onError(e -> active.set(false));

        Thread.ofVirtual().start(() -> poll(emitter, runId, run, active));

        return emitter;
    }

    private void poll(SseEmitter emitter, UUID runId, ExecutionRun initialRun, AtomicBoolean active) {
        int lastSentStepIndex = -1;
        int heartbeatTick = 0;

        try {
            // If execution already finished before SSE connected — replay from DB and close
            if (isTerminal(initialRun.getStatus())) {
                lastSentStepIndex = replaySteps(emitter, runId, lastSentStepIndex);
                sendRunCompleted(emitter, initialRun);
                emitter.complete();
                return;
            }

            while (active.get()) {
                // Fetch any new completed steps
                List<ExecutionStepResult> newSteps = stepResultRepository
                        .findAllByExecutionRunIdAndStepIndexGreaterThanOrderByStepIndex(runId, lastSentStepIndex);

                for (ExecutionStepResult step : newSteps) {
                    if (!active.get()) return;
                    emitter.send(SseEmitter.event()
                            .name("step-completed")
                            .data(toStepEvent(step)));
                    lastSentStepIndex = step.getStepIndex();
                }

                // Reload run to check terminal status
                ExecutionRun run = runRepository.findById(runId)
                        .orElseThrow(() -> new NotFoundException("Execution run not found: " + runId));

                if (isTerminal(run.getStatus())) {
                    // One final fetch — there may be steps saved in the same DB transaction as the status update
                    List<ExecutionStepResult> finalSteps = stepResultRepository
                            .findAllByExecutionRunIdAndStepIndexGreaterThanOrderByStepIndex(runId, lastSentStepIndex);
                    for (ExecutionStepResult step : finalSteps) {
                        emitter.send(SseEmitter.event()
                                .name("step-completed")
                                .data(toStepEvent(step)));
                    }
                    sendRunCompleted(emitter, run);
                    emitter.complete();
                    return;
                }

                // Periodic heartbeat (comment line — invisible to listeners, keeps connection alive)
                heartbeatTick++;
                if (heartbeatTick >= HEARTBEAT_EVERY_N_POLLS) {
                    emitter.send(SseEmitter.event().comment("heartbeat"));
                    heartbeatTick = 0;
                }

                Thread.sleep(POLL_INTERVAL_MS);
            }
        } catch (IOException e) {
            // Client disconnected — normal, not an error
            log.debug("[SSE] client disconnected for run {}", runId);
            active.set(false);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            log.debug("[SSE] polling thread interrupted for run {}", runId);
        } catch (Exception e) {
            log.error("[SSE] unexpected error streaming run {}: {}", runId, e.getMessage(), e);
            try {
                emitter.completeWithError(e);
            } catch (Exception ignored) {}
        }
    }

    private int replaySteps(SseEmitter emitter, UUID runId, int fromStepIndex) throws IOException {
        List<ExecutionStepResult> steps = stepResultRepository
                .findAllByExecutionRunIdAndStepIndexGreaterThanOrderByStepIndex(runId, fromStepIndex);
        int lastIndex = fromStepIndex;
        for (ExecutionStepResult step : steps) {
            emitter.send(SseEmitter.event()
                    .name("step-completed")
                    .data(toStepEvent(step)));
            lastIndex = step.getStepIndex();
        }
        return lastIndex;
    }

    private void sendRunCompleted(SseEmitter emitter, ExecutionRun run) throws IOException {
        int durationMs = 0;
        if (run.getStartedAt() != null && run.getCompletedAt() != null) {
            durationMs = (int) Duration.between(run.getStartedAt(), run.getCompletedAt()).toMillis();
        }
        emitter.send(SseEmitter.event()
                .name("run-completed")
                .data(new RunCompletedEvent(run.getId(), run.getStatus(), durationMs, run.getCompletedAt())));
    }

    private boolean isTerminal(ExecutionStatus status) {
        return status == ExecutionStatus.COMPLETED || status == ExecutionStatus.FAILED;
    }

    private StepProgressEvent toStepEvent(ExecutionStepResult step) {
        return new StepProgressEvent(
                step.getStepIndex(),
                step.getStepRefId(),
                step.getStatus(),
                step.getRequestSnapshot(),
                step.getResponseSnapshot(),
                step.getErrorMessage(),
                step.getDurationMs(),
                step.getStartedAt(),
                step.getCompletedAt()
        );
    }
}
