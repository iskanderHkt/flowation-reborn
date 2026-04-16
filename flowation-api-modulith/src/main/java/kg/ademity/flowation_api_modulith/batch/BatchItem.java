package kg.ademity.flowation_api_modulith.batch;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.relational.core.mapping.Table;

import java.util.UUID;

@Data
@Builder
@AllArgsConstructor
@Table("batch_items")
public class BatchItem {
    @Id
    private UUID id;
    private UUID batchId;
    private BatchItemType itemType;
    private UUID referenceId;
    private int itemOrder;
}
