package kg.ademity.flowation_api_modulith.catalog;

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
@Table("operation_groups")
public class OperationGroup {
    @Id
    private UUID id;
    private UUID ownerId;
    private String name;
    private UUID parentGroupId;
    private Instant createdAt;
}
