package kg.ademity.flowation_api_modulith.catalog.adapter;

import kg.ademity.flowation_api_modulith.catalog.Operation;
import kg.ademity.flowation_api_modulith.catalog.OperationService;
import kg.ademity.flowation_api_modulith.execution.port.OperationPort;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.Set;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class OperationPortAdapter implements OperationPort {

    private final OperationService operationService;

    @Override
    public Operation findById(UUID operationId) {
        return operationService.findById(operationId);
    }

    @Override
    public Map<UUID, String> findNamesByIds(Set<UUID> ids) {
        return operationService.resolveNames(ids);
    }
}
