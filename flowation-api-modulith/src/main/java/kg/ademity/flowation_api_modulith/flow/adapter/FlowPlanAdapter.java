package kg.ademity.flowation_api_modulith.flow.adapter;

import kg.ademity.flowation_api_modulith.execution.port.FlowPlanPort;
import kg.ademity.flowation_api_modulith.flow.Flow;
import kg.ademity.flowation_api_modulith.flow.FlowService;
import kg.ademity.flowation_api_modulith.flow.compiler.CompiledStep;
import kg.ademity.flowation_api_modulith.flow.compiler.FlowCompiler;
import kg.ademity.flowation_api_modulith.flow.step.FlowStep;
import kg.ademity.flowation_api_modulith.flow.step.FlowStepService;
import kg.ademity.flowation_api_modulith.flow.step.StepKind;
import kg.ademity.flowation_api_modulith.shared.CacheNames;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class FlowPlanAdapter implements FlowPlanPort {

    private final FlowService flowService;
    private final FlowCompiler flowCompiler;
    private final FlowStepService flowStepService;

    @Override
    @Cacheable(value = CacheNames.COMPILED_FLOWS, key = "#flowId")
    public List<CompiledStep> compilePlan(UUID flowId) {
        Flow flow = flowService.findById(flowId);
        return flowCompiler.compile(flow);
    }

    @Override
    public String getFlowName(UUID flowId) {
        return flowService.findById(flowId).getName();
    }

    @Override
    public Map<UUID, String> getFlowNamesByIds(Set<UUID> ids) {
        return flowService.resolveNames(ids);
    }

    @Override
    public Optional<CompiledStep> compileStep(UUID flowId, UUID stepId) {
        FlowStep step = flowStepService.getStep(flowId, stepId);
        if (step.getStepKind() == StepKind.FLOW_STEP) {
            return Optional.empty();
        }
        return flowCompiler.compileStep(step);
    }

    @Override
    public Optional<UUID> getNestedFlowId(UUID flowId, UUID stepId) {
        FlowStep step = flowStepService.getStep(flowId, stepId);
        if (step.getStepKind() == StepKind.FLOW_STEP) {
            return Optional.of(step.getNestedFlowId());
        }
        return Optional.empty();
    }
}
