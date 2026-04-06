package kg.ademity.flowation_api_modulith.flow_module.flow.step.extraction;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.relational.core.mapping.Table;

import java.util.UUID;

@Data
@Builder
@AllArgsConstructor
@Table("extraction_rules")
public class ExtractionRule {
    @Id
    private UUID id;
    private UUID flowStepId;
    private String sourcePath;
    private String targetVariable;
    private Integer ruleOrder;
}
