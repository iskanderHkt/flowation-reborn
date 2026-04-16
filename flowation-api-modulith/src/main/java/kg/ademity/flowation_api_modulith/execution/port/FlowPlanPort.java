package kg.ademity.flowation_api_modulith.execution.port;

import kg.ademity.flowation_api_modulith.flow.compiler.CompiledStep;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

public interface FlowPlanPort {

    /**
     * Returns the fully compiled flat step list for the given flow.
     * execution module knows nothing about Flow, FlowStep, FlowCompiler —
     * only about List<CompiledStep>.
     */
    List<CompiledStep> compilePlan(UUID flowId);

    String getFlowName(UUID flowId);

    Map<UUID, String> getFlowNamesByIds(Set<UUID> ids);

    /**
     * Compiles a single OPERATION_STEP. Returns empty if the step is a FLOW_STEP.
     */
    Optional<CompiledStep> compileStep(UUID flowId, UUID stepId);

    /**
     * Returns the nested flow id if the step is a FLOW_STEP, empty otherwise.
     */
    Optional<UUID> getNestedFlowId(UUID flowId, UUID stepId);
}
