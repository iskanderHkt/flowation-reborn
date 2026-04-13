package kg.ademity.flowation_api_modulith.execution.flow;

import kg.ademity.flowation_api_modulith.execution.AbsentValue;
import kg.ademity.flowation_api_modulith.execution.dto.FlowExecutionResultResponse;
import kg.ademity.flowation_api_modulith.execution.dto.StepResultResponse;
import kg.ademity.flowation_api_modulith.execution.exception.StepExecutionException;
import kg.ademity.flowation_api_modulith.execution.executor.OperationExecutor;
import kg.ademity.flowation_api_modulith.execution.executor.StepResult;
import kg.ademity.flowation_api_modulith.execution.port.EnvContextPort;
import kg.ademity.flowation_api_modulith.execution.port.FlowPlanPort;
import kg.ademity.flowation_api_modulith.execution.run.*;
import kg.ademity.flowation_api_modulith.flow.compiler.CompiledStep;
import kg.ademity.flowation_api_modulith.shared.TenantContext;
import kg.ademity.flowation_api_modulith.shared.exception.ValidationException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.*;

@Service
@RequiredArgsConstructor
public class FlowExecutionService {

    private final FlowPlanPort flowPlanPort;
    private final EnvContextPort envContextPort;
    private final ExecutionRunRepository runRepository;
    private final ExecutionStepResultRepository stepResultRepository;
    private final List<OperationExecutor> executors;
    private final TenantContext tenantContext;

    public FlowExecutionResultResponse execute(UUID flowId, UUID environmentId) {
        List<CompiledStep> compiledSteps = flowPlanPort.compilePlan(flowId);

        if (compiledSteps.isEmpty()) {
            throw new ValidationException("Flow has no executable steps");
        }

        String flowName = flowPlanPort.getFlowName(flowId);
        Map<String, Object> executionPlan = buildExecutionPlan(flowId, flowName, compiledSteps);

        ExecutionRun run = runRepository.save(ExecutionRun.builder()
                .ownerId(tenantContext.getOwnerId())
                .runMode(RunMode.FLOW)
                .status(ExecutionStatus.RUNNING)
                .flowId(flowId)
                .environmentId(environmentId)
                .executionPlan(executionPlan)
                .startedAt(Instant.now())
                .createdAt(Instant.now())
                .build());

        // runtime context — pre-seeded with environment variables (if provided)
        Map<String, Object> runtimeContext = new HashMap<>(envContextPort.loadContext(environmentId));
        List<ExecutionStepResult> stepResults = new ArrayList<>();
        ExecutionStatus overallStatus = ExecutionStatus.COMPLETED;
        boolean stopped = false;

        try {
            for (CompiledStep compiledStep : compiledSteps) {
                if (stopped) {
                    // mark remaining steps as SKIPPED
                    ExecutionStepResult skipped = stepResultRepository.save(ExecutionStepResult.builder()
                            .executionRunId(run.getId())
                            .stepIndex(compiledStep.stepIndex())
                            .stepRefId(compiledStep.stepRefId())
                            .status(ExecutionStatus.SKIPPED)
                            .startedAt(Instant.now())
                            .completedAt(Instant.now())
                            .build());
                    stepResults.add(skipped);
                    continue;
                }

                OperationExecutor executor = executors.stream()
                        .filter(e -> e.supports(compiledStep.operationType()))
                        .findFirst()
                        .orElseThrow(() -> new StepExecutionException(
                                "No executor for type: " + compiledStep.operationType()));

                Instant stepStart = Instant.now();
                StepResult result = executor.executeRaw(compiledStep.mergedConfig(), runtimeContext);
                Instant stepEnd = Instant.now();

                ExecutionStepResult savedStep = stepResultRepository.save(ExecutionStepResult.builder()
                        .executionRunId(run.getId())
                        .stepIndex(compiledStep.stepIndex())
                        .stepRefId(compiledStep.stepRefId())
                        .status(result.status())
                        .requestSnapshot(result.requestSnapshot())
                        .responseSnapshot(result.responseSnapshot())
                        .errorMessage(result.errorMessage())
                        .durationMs(result.durationMs())
                        .startedAt(stepStart)
                        .completedAt(stepEnd)
                        .build());
                stepResults.add(savedStep);

                // apply extraction rules → write to runtime context
                if (result.status() == ExecutionStatus.COMPLETED && result.responseSnapshot() != null) {
                    for (var rule : compiledStep.extractionRules()) {
                        Object extracted = JsonPathExtractor.extract(result.responseSnapshot(), rule.getSourcePath());
                        runtimeContext.put(rule.getTargetVariable(), extracted != null ? extracted : AbsentValue.INSTANCE);
                    }
                }

                // handle failure
                if (result.status() == ExecutionStatus.FAILED) {
                    overallStatus = ExecutionStatus.FAILED;
                    if (compiledStep.onFail().name().equals("STOP_FLOW")) {
                        stopped = true;
                    }
                    // SKIP_AND_CONTINUE — loop continues, but overall status stays FAILED
                }
            }
        } catch (Exception e) {
            overallStatus = ExecutionStatus.FAILED;
        } finally {
            // always finalize run — prevents stuck RUNNING status on unexpected errors
            run.setStatus(overallStatus);
            run.setCompletedAt(Instant.now());
            runRepository.save(run);
        }

        return toResponse(run, stepResults);
    }

    /**
     * Executes a single step in isolation with an empty RuntimeContext.
     * Result is NOT persisted — used for interactive testing during flow configuration.
     */
    public StepResultResponse testStep(UUID flowId, UUID stepId) {
        Optional<UUID> nestedFlowId = flowPlanPort.getNestedFlowId(flowId, stepId);

        if (nestedFlowId.isPresent()) {
            // FLOW_STEP — run the nested flow and return a summary
            Instant start = Instant.now();
            FlowExecutionResultResponse nestedResult = execute(nestedFlowId.get(), null);
            Instant end = Instant.now();
            String errorMsg = nestedResult.status() == ExecutionStatus.FAILED ? "Nested flow failed" : null;
            return new StepResultResponse(0, stepId, nestedResult.status(),
                    null, null, errorMsg, nestedResult.totalDurationMs(), start, end);
        }

        CompiledStep compiled = flowPlanPort.compileStep(flowId, stepId)
                .orElseThrow(() -> new ValidationException("Cannot compile step " + stepId));

        OperationExecutor executor = executors.stream()
                .filter(e -> e.supports(compiled.operationType()))
                .findFirst()
                .orElseThrow(() -> new StepExecutionException("No executor for type: " + compiled.operationType()));

        Instant start = Instant.now();
        StepResult result = executor.executeRaw(compiled.mergedConfig(), new HashMap<>());
        Instant end = Instant.now();

        return new StepResultResponse(
                0, stepId,
                result.status(),
                result.requestSnapshot(),
                result.responseSnapshot(),
                result.errorMessage(),
                result.durationMs(),
                start, end
        );
    }

    public List<FlowExecutionResultResponse> getHistory(UUID flowId) {
        // validate flow exists
        flowPlanPort.getFlowName(flowId);

        return runRepository.findAllByFlowIdOrderByCreatedAtDesc(flowId).stream()
                .map(run -> {
                    List<ExecutionStepResult> steps = stepResultRepository.findAllByExecutionRunIdOrderByStepIndex(run.getId());
                    return toResponse(run, steps);
                })
                .toList();
    }

    private FlowExecutionResultResponse toResponse(ExecutionRun run, List<ExecutionStepResult> stepResults) {
        int totalDurationMs = stepResults.stream()
                .filter(s -> s.getDurationMs() != null)
                .mapToInt(ExecutionStepResult::getDurationMs)
                .sum();

        List<StepResultResponse> steps = stepResults.stream()
                .map(s -> new StepResultResponse(
                        s.getStepIndex(),
                        s.getStepRefId(),
                        s.getStatus(),
                        s.getRequestSnapshot(),
                        s.getResponseSnapshot(),
                        s.getErrorMessage(),
                        s.getDurationMs(),
                        s.getStartedAt(),
                        s.getCompletedAt()
                ))
                .toList();

        return new FlowExecutionResultResponse(
                run.getId(),
                run.getFlowId(),
                RunMode.FLOW,
                run.getStatus(),
                run.getStartedAt(),
                run.getCompletedAt(),
                totalDurationMs,
                steps
        );
    }

    private Map<String, Object> buildExecutionPlan(UUID flowId, String flowName, List<CompiledStep> steps) {
        List<Map<String, Object>> stepSnapshots = steps.stream()
                .map(s -> Map.<String, Object>of(
                        "stepIndex", s.stepIndex(),
                        "stepRefId", s.stepRefId() != null ? s.stepRefId().toString() : "",
                        "operationName", s.operationName(),
                        "operationType", s.operationType().name(),
                        "onFail", s.onFail().name()
                ))
                .toList();

        return Map.of(
                "compiledAt", Instant.now().toString(),
                "sourceFlowId", flowId.toString(),
                "sourceFlowName", flowName,
                "steps", stepSnapshots
        );
    }
}
