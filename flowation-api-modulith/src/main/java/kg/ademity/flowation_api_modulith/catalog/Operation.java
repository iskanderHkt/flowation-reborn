package kg.ademity.flowation_api_modulith.catalog;

import kg.ademity.flowation_api_modulith.catalog.config.OperationConfig;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.relational.core.mapping.Table;

import java.time.Instant;
import java.util.UUID;

@Data
@Builder
@AllArgsConstructor
@Table("operations")
public class Operation {
    @Id
    private UUID id;
    private UUID ownerId;
    private UUID groupId;
    private String name;
    private OperationType type;
    private OperationConfig configTemplate;
    private Instant createdAt;
    private Instant updatedAt;
}
