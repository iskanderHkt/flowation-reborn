package kg.ademity.flowation_api_modulith.flow_module.operation;

import kg.ademity.flowation_api_modulith.flow_module.operation.config.OperationConfig;
import kg.ademity.flowation_api_modulith.shared.DevContext;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class OperationService {
    private final OperationRepository repository;
    private final DevContext devContext;

    public Operation create(String name, OperationConfig config) {
        Operation operationToCreate = Operation.builder()
                .ownerId(devContext.getDevUserId())
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
                .orElseThrow(() -> new RuntimeException("Operation with id: " + operationId + " was not found"));
    }

    public List<Operation> findAll() {
        return repository.findAllByOwnerId(devContext.getDevUserId());
    }

    public Operation update(UUID operationId, String name, OperationConfig config) {
        Operation operationFound = repository.findById(operationId)
                .orElseThrow(() -> new RuntimeException("Operation with id: " + operationId + " was not found"));

        operationFound.setName(name);
        operationFound.setConfigTemplate(config);
        operationFound.setUpdatedAt(Instant.now());

        return repository.save(operationFound);
    }

    public void delete(UUID operationId) {
        repository.deleteById(operationId);
    }
}
