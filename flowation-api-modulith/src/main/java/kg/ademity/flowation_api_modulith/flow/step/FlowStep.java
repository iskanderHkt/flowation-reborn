package kg.ademity.flowation_api_modulith.flow.step;

import kg.ademity.flowation_api_modulith.catalog.config.OperationConfig;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.relational.core.mapping.Table;

import java.util.UUID;

@Data
@Builder
@AllArgsConstructor
@Table("flow_steps")
public class FlowStep {
    @Id
    private UUID id;
    private UUID flowId;
    private Integer stepOrder;
    private StepKind stepKind;
    private Binding binding;
    private UUID operationId;
    private OperationConfig configOverride;
    private OperationConfig ownConfig;
    private UUID sourceOperationId;
    private UUID nestedFlowId;
    private OnFailStrategy onFail;
}
