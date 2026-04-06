package kg.ademity.flowation_api_modulith.flow_module.flow.step.dto.request;

import java.util.UUID;

public record ReorderEntry(
        UUID stepId,
        int newOrder
) {
}
