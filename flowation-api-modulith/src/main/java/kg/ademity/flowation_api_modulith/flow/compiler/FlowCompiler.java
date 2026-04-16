package kg.ademity.flowation_api_modulith.flow.compiler;

import kg.ademity.flowation_api_modulith.flow.Flow;
import kg.ademity.flowation_api_modulith.flow.FlowService;
import kg.ademity.flowation_api_modulith.flow.step.*;
import kg.ademity.flowation_api_modulith.flow.step.extraction.ExtractionRule;
import kg.ademity.flowation_api_modulith.flow.step.extraction.ExtractionRuleService;
import kg.ademity.flowation_api_modulith.catalog.Operation;
import kg.ademity.flowation_api_modulith.catalog.OperationService;
import kg.ademity.flowation_api_modulith.catalog.config.OperationConfig;
import kg.ademity.flowation_api_modulith.shared.exception.NotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

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
        List<CompiledStep> steps = new ArrayList<>();
        compileRecursive(flow, steps, 0);
        return steps;
    }

    private void compileRecursive(Flow flow, List<CompiledStep> steps, int depth) {
        if (depth > maxNestingDepth) {
            throw new FlowCompilationException(
                    "Maximum nesting depth of " + maxNestingDepth + " exceeded at flow: " + flow.getName());
        }

        List<FlowStep> flowSteps = flowStepService.getAllSteps(flow.getId());

        for (FlowStep flowStep : flowSteps) {
            if (flowStep.getStepKind() == StepKind.FLOW_STEP) {
                Flow nestedFlow = flowService.findById(flowStep.getNestedFlowId());
                compileRecursive(nestedFlow, steps, depth + 1);
            } else {
                // load operation once — used by both config resolution and name resolution
                Operation operation = flowStep.getBinding() == Binding.LINKED
                        ? operationService.findById(flowStep.getOperationId())
                        : null;
                OperationConfig config = resolveConfig(flowStep, operation);
                String operationName = resolveOperationName(flowStep, operation);
                List<ExtractionRule> rules = extractionRuleService.getRulesByStepId(flowStep.getId());

                steps.add(new CompiledStep(
                        steps.size(),
                        flowStep.getId(),
                        operationName,
                        config.type(),
                        config,
                        flowStep.getOnFail(),
                        rules
                ));
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
