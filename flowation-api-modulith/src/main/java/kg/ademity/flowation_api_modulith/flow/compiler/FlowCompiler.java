package kg.ademity.flowation_api_modulith.flow.compiler;

import kg.ademity.flowation_api_modulith.flow.Flow;
import kg.ademity.flowation_api_modulith.flow.FlowService;
import kg.ademity.flowation_api_modulith.flow.step.*;
import kg.ademity.flowation_api_modulith.flow.step.extraction.ExtractionRule;
import kg.ademity.flowation_api_modulith.flow.step.extraction.ExtractionRuleService;
import kg.ademity.flowation_api_modulith.catalog.Operation;
import kg.ademity.flowation_api_modulith.catalog.OperationService;
import kg.ademity.flowation_api_modulith.catalog.config.OperationConfig;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class FlowCompiler {

    @Value("${flowation.execution.max-nesting-depth:10}")
    private int maxNestingDepth;

    private final FlowStepService flowStepService;
    private final FlowService flowService;
    private final OperationService operationService;
    private final ExtractionRuleService extractionRuleService;

    public List<CompiledStep> compile(Flow flow) {
        // Phase 1: collect all operation steps in execution order (recursive, flattened)
        List<FlowStep> operationSteps = new ArrayList<>();
        collectOperationSteps(flow, operationSteps, 0);

        // Phase 2: bulk load all extraction rules — 1 query instead of N
        List<UUID> stepIds = operationSteps.stream().map(FlowStep::getId).toList();
        Map<UUID, List<ExtractionRule>> rulesByStepId = extractionRuleService.getRulesByStepIds(stepIds);

        // Phase 3: assemble CompiledStep list
        List<CompiledStep> compiled = new ArrayList<>();
        for (FlowStep step : operationSteps) {
            Operation operation = step.getBinding() == Binding.LINKED
                    ? operationService.findById(step.getOperationId())
                    : null;
            OperationConfig config = resolveConfig(step, operation);
            String name = resolveOperationName(step, operation);
            List<ExtractionRule> rules = rulesByStepId.getOrDefault(step.getId(), List.of());
            compiled.add(new CompiledStep(compiled.size(), step.getId(), name, config.type(), config, step.getOnFail(), rules));
        }
        return compiled;
    }

    /**
     * Recursively walks the flow tree and collects all OPERATION_STEP entries in execution order.
     * FLOW_STEP entries are resolved into their nested steps — they never appear in the result.
     */
    private void collectOperationSteps(Flow flow, List<FlowStep> result, int depth) {
        if (depth > maxNestingDepth) {
            throw new FlowCompilationException(
                    "Maximum nesting depth of " + maxNestingDepth + " exceeded at flow: " + flow.getName());
        }
        for (FlowStep step : flowStepService.getAllSteps(flow.getId())) {
            if (step.getStepKind() == StepKind.FLOW_STEP) {
                Flow nestedFlow = flowService.findById(step.getNestedFlowId());
                collectOperationSteps(nestedFlow, result, depth + 1);
            } else {
                result.add(step);
            }
        }
    }

    /** Compiles a single OPERATION_STEP into a CompiledStep. Returns empty for FLOW_STEP. */
    public Optional<CompiledStep> compileStep(FlowStep step) {
        if (step.getStepKind() == StepKind.FLOW_STEP) {
            return Optional.empty();
        }
        Operation operation = step.getBinding() == Binding.LINKED
                ? operationService.findById(step.getOperationId())
                : null;
        OperationConfig config = resolveConfig(step, operation);
        List<ExtractionRule> rules = extractionRuleService.getRulesByStepId(step.getId());
        return Optional.of(new CompiledStep(
                0,
                step.getId(),
                resolveOperationName(step, operation),
                config.type(),
                config,
                step.getOnFail(),
                rules
        ));
    }

    OperationConfig resolveConfig(FlowStep step, Operation operation) {
        if (step.getBinding() == Binding.LINKED) {
            if (step.getConfigOverride() != null) {
                return OperationConfig.merge(operation.getConfigTemplate(), step.getConfigOverride());
            }
            return operation.getConfigTemplate();
        } else {
            return step.getOwnConfig();
        }
    }

    private String resolveOperationName(FlowStep step, Operation operation) {
        if (step.getBinding() == Binding.LINKED) {
            return operation.getName();
        }
        if (step.getSourceOperationId() != null) {
            return operationService.findById(step.getSourceOperationId()).getName() + " (detached)";
        }
        return "Detached operation";
    }
}
