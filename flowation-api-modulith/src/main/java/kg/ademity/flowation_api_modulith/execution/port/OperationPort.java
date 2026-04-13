package kg.ademity.flowation_api_modulith.execution.port;

import kg.ademity.flowation_api_modulith.catalog.Operation;

import java.util.UUID;

public interface OperationPort {

    Operation findById(UUID operationId);
}
