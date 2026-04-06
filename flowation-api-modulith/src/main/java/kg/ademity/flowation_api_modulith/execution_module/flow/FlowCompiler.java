package kg.ademity.flowation_api_modulith.execution_module.flow;

import kg.ademity.flowation_api_modulith.flow_module.flow.Flow;
import kg.ademity.flowation_api_modulith.flow_module.flow.FlowService;
import kg.ademity.flowation_api_modulith.flow_module.flow.step.*;
import kg.ademity.flowation_api_modulith.flow_module.flow.step.extraction.ExtractionRule;
import kg.ademity.flowation_api_modulith.flow_module.flow.step.extraction.ExtractionRuleService;
import kg.ademity.flowation_api_modulith.flow_module.operation.Operation;
import kg.ademity.flowation_api_modulith.flow_module.operation.OperationService;
import kg.ademity.flowation_api_modulith.flow_module.operation.config.OperationConfig;
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
            throw new RuntimeException(
                    "Maximum nesting depth of " + maxNestingDepth + " exceeded at flow: " + flow.getName());
        }

        List<FlowStep> flowSteps = flowStepService.getAllSteps(flow.getId());

        for (FlowStep flowStep : flowSteps) {
            if (flowStep.getStepKind() == StepKind.FLOW_STEP) {
                Flow nestedFlow = flowService.findById(flowStep.getNestedFlowId());
                compileRecursive(nestedFlow, steps, depth + 1);
            } else {
                // OPERATION_STEP
                OperationConfig config = resolveConfig(flowStep);
                String operationName = resolveOperationName(flowStep);
                var operationType = resolveOperationType(flowStep, config);
                List<ExtractionRule> rules = extractionRuleService.getRulesByStepId(flowStep.getId());

                steps.add(new CompiledStep(
                        steps.size(),
                        flowStep.getId(),
                        operationName,
                        operationType,
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
        OperationConfig config = resolveConfig(step);
        List<ExtractionRule> rules = extractionRuleService.getRulesByStepId(step.getId());
        return Optional.of(new CompiledStep(
                0,
                step.getId(),
                resolveOperationName(step),
                resolveOperationType(step, config),
                config,
                step.getOnFail(),
                rules
        ));
    }

    OperationConfig resolveConfig(FlowStep step) {
        if (step.getBinding() == Binding.LINKED) {
            Operation operation = operationService.findById(step.getOperationId());
            // TODO: merge configOverride on top of configTemplate if configOverride is not null
            // For now, configOverride is ignored — full override support requires deep merge per config type
            if (step.getConfigOverride() != null) {
                return step.getConfigOverride();
            }
            return operation.getConfigTemplate();
        } else {
            // DETACHED — own_config is the full config
            return step.getOwnConfig();
        }
    }

    private String resolveOperationName(FlowStep step) {
        if (step.getBinding() == Binding.LINKED) {
            return operationService.findById(step.getOperationId()).getName();
        }
        if (step.getSourceOperationId() != null) {
            return operationService.findById(step.getSourceOperationId()).getName() + " (detached)";
        }
        return "Detached operation";
    }

    private kg.ademity.flowation_api_modulith.flow_module.operation.OperationType resolveOperationType(
            FlowStep step, OperationConfig config) {
        return config.type();
    }
}
