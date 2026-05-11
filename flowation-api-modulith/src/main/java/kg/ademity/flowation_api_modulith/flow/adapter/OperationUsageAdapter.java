package kg.ademity.flowation_api_modulith.flow.adapter;

import kg.ademity.flowation_api_modulith.catalog.port.OperationUsagePort;
import kg.ademity.flowation_api_modulith.flow.Flow;
import kg.ademity.flowation_api_modulith.flow.FlowRepository;
import kg.ademity.flowation_api_modulith.flow.step.Binding;
import kg.ademity.flowation_api_modulith.flow.step.FlowStep;
import kg.ademity.flowation_api_modulith.flow.step.FlowStepRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class OperationUsageAdapter implements OperationUsagePort {

    private final FlowStepRepository flowStepRepository;
    private final FlowRepository flowRepository;

    @Override
    public List<String> findLinkedFlowNames(UUID operationId) {
        return flowStepRepository
                .findAllByOperationIdAndBinding(operationId, Binding.LINKED)
                .stream()
                .map(FlowStep::getFlowId)
                .distinct()
                .map(flowRepository::findByIdAndDeletedAtIsNull)
                .flatMap(java.util.Optional::stream)
                .map(Flow::getName)
                .toList();
    }

    @Override
    public List<UUID> findLinkedFlowIds(UUID operationId) {
        return flowStepRepository
                .findAllByOperationIdAndBinding(operationId, Binding.LINKED)
                .stream()
                .map(FlowStep::getFlowId)
                .distinct()
                .toList();
    }
}
