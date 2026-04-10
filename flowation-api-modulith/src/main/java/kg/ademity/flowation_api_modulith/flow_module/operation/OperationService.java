package kg.ademity.flowation_api_modulith.flow_module.operation;

import kg.ademity.flowation_api_modulith.flow_module.flow.Flow;
import kg.ademity.flowation_api_modulith.flow_module.flow.FlowRepository;
import kg.ademity.flowation_api_modulith.flow_module.flow.step.FlowStep;
import kg.ademity.flowation_api_modulith.flow_module.flow.step.FlowStepRepository;
import kg.ademity.flowation_api_modulith.flow_module.flow.step.Binding;
import kg.ademity.flowation_api_modulith.flow_module.operation.config.OperationConfig;
import kg.ademity.flowation_api_modulith.shared.TenantContext;
import kg.ademity.flowation_api_modulith.shared.exception.NotFoundException;
import kg.ademity.flowation_api_modulith.shared.exception.ValidationException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class OperationService {
    private final OperationRepository repository;
    private final FlowStepRepository flowStepRepository;
    private final FlowRepository flowRepository;
    private final TenantContext tenantContext;

    public Operation create(String name, OperationConfig config) {
        Operation operationToCreate = Operation.builder()
                .ownerId(tenantContext.getOwnerId())
                .name(name)
                .type(config.type())
                .configTemplate(config)
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .build();

        return repository.save(operationToCreate);
    }

    public Operation findById(UUID operationId) {

        return repository.findById(operationId)
                .orElseThrow(() -> new NotFoundException("Operation", operationId));
    }

    public List<Operation> findAll() {
        return repository.findAllByOwnerId(tenantContext.getOwnerId());
    }

    public Operation update(UUID operationId, String name, OperationConfig config) {
        Operation operationFound = repository.findById(operationId)
                .orElseThrow(() -> new NotFoundException("Operation", operationId));

        operationFound.setName(name);
        operationFound.setConfigTemplate(config);
        operationFound.setUpdatedAt(Instant.now());

        return repository.save(operationFound);
    }

    public void delete(UUID operationId) {
        List<FlowStep> linkedSteps = flowStepRepository.findAllByOperationIdAndBinding(operationId, Binding.LINKED);

        if (!linkedSteps.isEmpty()) {
            List<String> flowNames = linkedSteps.stream()
                    .map(FlowStep::getFlowId)
                    .distinct()
                    .map(flowId -> flowRepository.findById(flowId)
                            .map(Flow::getName)
                            .orElse("Unknown flow"))
                    .toList();

            throw new ValidationException(
                    "Cannot delete operation: linked in flows: " + String.join(", ", flowNames));
        }

        repository.deleteById(operationId);
    }
}
