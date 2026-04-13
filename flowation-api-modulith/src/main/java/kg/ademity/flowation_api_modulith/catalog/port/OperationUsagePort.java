package kg.ademity.flowation_api_modulith.catalog.port;

import java.util.List;
import java.util.UUID;

public interface OperationUsagePort {

    /**
     * Returns names of flows in which the operation is used as LINKED.
     * Empty list means the operation can be safely deleted.
     */
    List<String> findLinkedFlowNames(UUID operationId);
}
