package kg.ademity.flowation_api_modulith.execution_module.flow;

import kg.ademity.flowation_api_modulith.execution_module.dto.FlowExecutionResultResponse;
import kg.ademity.flowation_api_modulith.execution_module.dto.StepResultResponse;
import kg.ademity.flowation_api_modulith.execution_module.executor.OperationExecutor;
import kg.ademity.flowation_api_modulith.execution_module.executor.StepResult;
import kg.ademity.flowation_api_modulith.execution_module.run.*;
import kg.ademity.flowation_api_modulith.flow_module.flow.Flow;
import kg.ademity.flowation_api_modulith.flow_module.flow.FlowService;
import kg.ademity.flowation_api_modulith.flow_module.flow.step.FlowStep;
import kg.ademity.flowation_api_modulith.flow_module.flow.step.FlowStepService;
import kg.ademity.flowation_api_modulith.flow_module.flow.step.OnFailStrategy;
import kg.ademity.flowation_api_modulith.flow_module.flow.step.StepKind;
import kg.ademity.flowation_api_modulith.flow_module.flow.step.extraction.ExtractionRule;
import kg.ademity.flowation_api_modulith.environment_module.EnvironmentService;
import kg.ademity.flowation_api_modulith.shared.DevContext;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.*;

@Service
@RequiredArgsConstructor
public class FlowExecutionService {

    private final FlowService flowService;
    private final FlowStepService flowStepService;
    private final FlowCompiler compiler;
    private final ExecutionRunRepository runRepository;
    private final ExecutionStepResultRepository stepResultRepository;
    private final List<OperationExecutor> executors;
    private final DevContext devContext;
    private final EnvironmentService environmentService;

    public FlowExecutionResultResponse execute(UUID flowId, UUID environmentId) {
        Flow flow = flowService.findById(flowId);

        // compile flow → flat step list
        List<CompiledStep> compiledSteps = compiler.compile(flow);

        if (compiledSteps.isEmpty()) {
            throw new RuntimeException("Flow '" + flow.getName() + "' has no executable steps");
        }

        // build execution plan snapshot
        Map<String, Object> executionPlan = buildExecutionPlan(flow, compiledSteps);

        // create execution run
        ExecutionRun run = runRepository.save(ExecutionRun.builder()
                .ownerId(devContext.getDevUserId())
                .runMode(RunMode.FLOW)
                .status(ExecutionStatus.RUNNING)
                .flowId(flowId)
                .environmentId(environmentId)
                .executionPlan(executionPlan)
                .startedAt(Instant.now())
                .createdAt(Instant.now())
                .build());

        // runtime context — pre-seeded with environment variables (if provided)
        Map<String, Object> runtimeContext = new HashMap<>();
        if (environmentId != null) {
            runtimeContext.putAll(environmentService.loadAsContext(environmentId));
        }
        List<ExecutionStepResult> stepResults = new ArrayList<>();
        ExecutionStatus overallStatus = ExecutionStatus.COMPLETED;
        boolean stopped = false;

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

            // find executor
            OperationExecutor executor = executors.stream()
                    .filter(e -> e.supports(compiledStep.operationType()))
                    .findFirst()
                    .orElseThrow(() -> new RuntimeException(
                            "No executor for type: " + compiledStep.operationType()));

            // execute step with runtime context
            Instant stepStart = Instant.now();
            StepResult result = executor.execute(compiledStep.mergedConfig(), runtimeContext);
            Instant stepEnd = Instant.now();

            // save step result
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
                for (ExtractionRule rule : compiledStep.extractionRules()) {
                    Object extracted = JsonPathExtractor.extract(result.responseSnapshot(), rule.getSourcePath());
                    if (extracted != null) {
                        runtimeContext.put(rule.getTargetVariable(), extracted);
                    }
                }
            }

            // handle failure
            if (result.status() == ExecutionStatus.FAILED) {
                overallStatus = ExecutionStatus.FAILED;
                if (compiledStep.onFail() == OnFailStrategy.STOP_FLOW) {
                    stopped = true;
                }
                // SKIP_AND_CONTINUE — loop continues, but overall status stays FAILED
            }
        }

        // finalize run
        Instant completedAt = Instant.now();
        run.setStatus(overallStatus);
        run.setCompletedAt(completedAt);
        runRepository.save(run);

        return toResponse(run, stepResults);
    }

    /**
     * Executes a single step in isolation with an empty RuntimeContext.
     * Result is NOT persisted — used for interactive testing during flow configuration.
     */
    public StepResultResponse testStep(UUID flowId, UUID stepId) {
        FlowStep step = flowStepService.getStep(flowId, stepId);

        // FLOW_STEP — run the nested flow and return a summary
        if (step.getStepKind() == StepKind.FLOW_STEP) {
            Instant start = Instant.now();
            FlowExecutionResultResponse nestedResult = execute(step.getNestedFlowId(), null);
            Instant end = Instant.now();
            String errorMsg = nestedResult.status() == ExecutionStatus.FAILED ? "Nested flow failed" : null;
            return new StepResultResponse(0, step.getId(), nestedResult.status(),
                    null, null, errorMsg, nestedResult.totalDurationMs(), start, end);
        }

        CompiledStep compiled = compiler.compileStep(step)
                .orElseThrow(() -> new RuntimeException("Cannot compile step " + stepId));

        OperationExecutor executor = executors.stream()
                .filter(e -> e.supports(compiled.operationType()))
                .findFirst()
                .orElseThrow(() -> new RuntimeException("No executor for type: " + compiled.operationType()));

        Instant start = Instant.now();
        StepResult result = executor.execute(compiled.mergedConfig(), new HashMap<>());
        Instant end = Instant.now();

        return new StepResultResponse(
                0, step.getId(),
                result.status(),
                result.requestSnapshot(),
                result.responseSnapshot(),
                result.errorMessage(),
                result.durationMs(),
                start, end
        );
    }

    public List<FlowExecutionResultResponse> getHistory(UUID flowId) {
        flowService.findById(flowId);

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

    private Map<String, Object> buildExecutionPlan(Flow flow, List<CompiledStep> steps) {
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
                "sourceFlowId", flow.getId().toString(),
                "sourceFlowName", flow.getName(),
                "steps", stepSnapshots
        );
    }
}
