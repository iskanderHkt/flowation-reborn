package kg.ademity.flowation_api_modulith.catalog;

import kg.ademity.flowation_api_modulith.catalog.config.OperationConfig;
import kg.ademity.flowation_api_modulith.catalog.port.OperationUsagePort;
import kg.ademity.flowation_api_modulith.shared.CacheNames;
import kg.ademity.flowation_api_modulith.shared.TenantContext;
import kg.ademity.flowation_api_modulith.shared.exception.NotFoundException;
import kg.ademity.flowation_api_modulith.shared.exception.ValidationException;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.Cache;
import org.springframework.cache.CacheManager;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.*;

@Service
@RequiredArgsConstructor
public class OperationService {
    private final OperationRepository repository;
    private final OperationUsagePort operationUsagePort;
    private final TenantContext tenantContext;
    private final CacheManager cacheManager;

    public Operation create(String name, OperationConfig config, UUID groupId) {
        Operation operationToCreate = Operation.builder()
                .ownerId(tenantContext.getOwnerId())
                .name(name)
                .type(config.type())
                .configTemplate(config)
                .groupId(groupId)
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .build();

        return repository.save(operationToCreate);
    }

    public Operation findById(UUID operationId) {

        return repository.findByIdAndDeletedAtIsNull(operationId)
                .orElseThrow(() -> new NotFoundException("Operation", operationId));
    }

    public List<Operation> findAll() {
        return repository.findAllByOwnerIdAndDeletedAtIsNull(tenantContext.getOwnerId());
    }

    public Operation update(UUID operationId, String name, OperationConfig config, UUID groupId) {
        Operation operationFound = repository.findByIdAndDeletedAtIsNull(operationId)
                .orElseThrow(() -> new NotFoundException("Operation", operationId));

        operationFound.setName(name);
        operationFound.setConfigTemplate(config);
        operationFound.setGroupId(groupId);
        operationFound.setUpdatedAt(Instant.now());

        Operation saved = repository.save(operationFound);

        Cache cache = cacheManager.getCache(CacheNames.COMPILED_FLOWS);
        operationUsagePort.findLinkedFlowIds(operationId)
                .forEach(Objects.requireNonNull(cache)::evict);

        return saved;
    }

    public Map<UUID, String> resolveNames(Set<UUID> ids) {
        Map<UUID, String> result = new HashMap<>();
        repository.findAllById(ids).forEach(o -> result.put(o.getId(), o.getName()));
        return result;
    }

    public void delete(UUID operationId) {
        Operation operation = repository.findByIdAndDeletedAtIsNull(operationId)
                .orElseThrow(() -> new NotFoundException("Operation", operationId));

        List<String> linkedFlowNames = operationUsagePort.findLinkedFlowNames(operationId);

        if (!linkedFlowNames.isEmpty()) {
            throw new ValidationException(
                    "Cannot delete operation: linked in flows: " + String.join(", ", linkedFlowNames));
        }

        operation.setDeletedAt(Instant.now());
        repository.save(operation);
    }
}
