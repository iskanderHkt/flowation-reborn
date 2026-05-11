package kg.ademity.flowation_api_modulith.flow.step;

import kg.ademity.flowation_api_modulith.flow.FlowService;
import kg.ademity.flowation_api_modulith.flow.step.dto.request.FlowStepCreateRequest;
import kg.ademity.flowation_api_modulith.flow.step.dto.request.FlowStepUpdateRequest;
import kg.ademity.flowation_api_modulith.flow.step.dto.request.ReorderEntry;
import kg.ademity.flowation_api_modulith.catalog.Operation;
import kg.ademity.flowation_api_modulith.catalog.OperationService;
import kg.ademity.flowation_api_modulith.catalog.config.OperationConfig;
import kg.ademity.flowation_api_modulith.shared.CacheNames;
import kg.ademity.flowation_api_modulith.shared.exception.NotFoundException;
import kg.ademity.flowation_api_modulith.shared.exception.ValidationException;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class FlowStepService {

    @Value("${flowation.execution.max-nesting-depth:10}")
    private int maxNestingDepth;

    private final FlowStepRepository flowStepRepository;
    private final FlowService flowService;
    private final OperationService operationService;

    @Transactional(isolation = Isolation.SERIALIZABLE)
    @CacheEvict(value = CacheNames.COMPILED_FLOWS, key = "#flowId")
    public FlowStep addStep(UUID flowId, FlowStepCreateRequest request) {
        // verify flow exists and belongs to current user
        flowService.findById(flowId);

        // verify referenced operation exists (for LINKED)
        if (request.binding() == Binding.LINKED) {
            operationService.findById(request.operationId());
        }

        // for DETACHED — copy config from source operation if ownConfig not provided
        OperationConfig ownConfig = request.ownConfig();
        UUID sourceOperationId = request.sourceOperationId();
        if (request.binding() == Binding.DETACHED && ownConfig == null && sourceOperationId != null) {
            Operation source = operationService.findById(sourceOperationId);
            ownConfig = source.getConfigTemplate();
        }

        // verify nested flow exists + cycle/depth check (for FLOW_STEP)
        if (request.stepKind() == StepKind.FLOW_STEP) {
            flowService.findById(request.nestedFlowId());
            validateNoCycle(flowId, request.nestedFlowId());
        }

        // auto-assign stepOrder = last + 1
        List<FlowStep> existing = flowStepRepository.findAllByFlowIdOrderByStepOrder(flowId);
        int nextOrder = existing.isEmpty() ? 0 : existing.getLast().getStepOrder() + 1;

        FlowStep step = FlowStep.builder()
                .flowId(flowId)
                .stepOrder(nextOrder)
                .stepKind(request.stepKind())
                .binding(request.binding())
                .operationId(request.operationId())
                .configOverride(request.configOverride())
                .ownConfig(ownConfig)
                .sourceOperationId(sourceOperationId)
                .nestedFlowId(request.nestedFlowId())
                .onFail(request.onFail() != null ? request.onFail() : OnFailStrategy.STOP_FLOW)
                .build();

        return flowStepRepository.save(step);
    }

    public FlowStep getStep(UUID flowId, UUID stepId) {
        return flowStepRepository.findById(stepId)
                .filter(s -> s.getFlowId().equals(flowId))
                .orElseThrow(() -> new NotFoundException("Step " + stepId + " not found in flow " + flowId));
    }

    public List<FlowStep> getAllSteps(UUID flowId) {
        flowService.findById(flowId);
        return flowStepRepository.findAllByFlowIdOrderByStepOrder(flowId);
    }

    @CacheEvict(value = CacheNames.COMPILED_FLOWS, key = "#flowId")
    public FlowStep updateStep(UUID flowId, UUID stepId, FlowStepUpdateRequest request) {
        FlowStep step = getStep(flowId, stepId);

        // verify references if changed
        if (request.binding() == Binding.LINKED && request.operationId() != null) {
            operationService.findById(request.operationId());
        }
        if (request.stepKind() == StepKind.FLOW_STEP && request.nestedFlowId() != null) {
            flowService.findById(request.nestedFlowId());
            validateNoCycle(flowId, request.nestedFlowId());
        }

        step.setStepKind(request.stepKind());
        step.setBinding(request.binding());
        step.setOperationId(request.operationId());
        step.setConfigOverride(request.configOverride());
        step.setOwnConfig(request.ownConfig());
        step.setSourceOperationId(request.sourceOperationId());
        step.setNestedFlowId(request.nestedFlowId());
        if (request.onFail() != null) {
            step.setOnFail(request.onFail());
        }

        return flowStepRepository.save(step);
    }

    @Transactional
    @CacheEvict(value = CacheNames.COMPILED_FLOWS, key = "#flowId")
    public void deleteStep(UUID flowId, UUID stepId) {
        FlowStep step = getStep(flowId, stepId);
        int deletedOrder = step.getStepOrder();

        flowStepRepository.delete(step);

        // shift remaining steps down to fill the gap
        List<FlowStep> remaining = flowStepRepository.findAllByFlowIdOrderByStepOrder(flowId);
        for (FlowStep s : remaining) {
            if (s.getStepOrder() > deletedOrder) {
                s.setStepOrder(s.getStepOrder() - 1);
                flowStepRepository.save(s);
            }
        }
    }

    @Transactional
    @CacheEvict(value = CacheNames.COMPILED_FLOWS, key = "#flowId")
    public void reorderSteps(UUID flowId, List<ReorderEntry> entries) {
        flowService.findById(flowId);

        for (ReorderEntry entry : entries) {
            FlowStep step = getStep(flowId, entry.stepId());
            step.setStepOrder(entry.newOrder());
            flowStepRepository.save(step);
        }
    }

    // used by Operation delete check (task #10)
    public List<FlowStep> findLinkedStepsByOperationId(UUID operationId) {
        return flowStepRepository.findAllByOperationIdAndBinding(operationId, Binding.LINKED);
    }

    /**
     * Validates that adding nestedFlowId into parentFlowId:
     * 1. Does not create a cycle (DFS path-based, handles diamond-shaped DAGs correctly)
     * 2. Does not exceed maxNestingDepth
     *
     * depth=1 means parentFlowId directly contains nestedFlowId.
     */
    private void validateNoCycle(UUID parentFlowId, UUID nestedFlowId) {
        Set<UUID> path = new HashSet<>();
        path.add(parentFlowId);
        checkRecursive(nestedFlowId, path, 1);
    }

    private void checkRecursive(UUID flowId, Set<UUID> path, int depth) {
        if (path.contains(flowId)) {
            throw new ValidationException(
                    "Cycle detected: flow " + flowId + " creates a circular reference");
        }
        if (depth > maxNestingDepth) {
            throw new ValidationException(
                    "Maximum nesting depth of " + maxNestingDepth + " exceeded");
        }

        path.add(flowId);

        List<FlowStep> nestedSteps = flowStepRepository.findAllByFlowIdOrderByStepOrder(flowId)
                .stream()
                .filter(s -> s.getStepKind() == StepKind.FLOW_STEP && s.getNestedFlowId() != null)
                .toList();

        for (FlowStep step : nestedSteps) {
            checkRecursive(step.getNestedFlowId(), path, depth + 1);
        }

        path.remove(flowId);
    }

}
