package kg.ademity.flowation_api_modulith.catalog;

import kg.ademity.flowation_api_modulith.catalog.config.OperationConfig;
import kg.ademity.flowation_api_modulith.catalog.port.OperationUsagePort;
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
    private final OperationUsagePort operationUsagePort;
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
        List<String> linkedFlowNames = operationUsagePort.findLinkedFlowNames(operationId);

        if (!linkedFlowNames.isEmpty()) {
            throw new ValidationException(
                    "Cannot delete operation: linked in flows: " + String.join(", ", linkedFlowNames));
        }

        repository.deleteById(operationId);
    }
}
