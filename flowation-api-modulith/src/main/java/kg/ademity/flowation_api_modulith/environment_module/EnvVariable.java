package kg.ademity.flowation_api_modulith.environment_module;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.relational.core.mapping.Table;

import java.util.UUID;

@Data
@Builder
@AllArgsConstructor
@Table("env_variables")
public class EnvVariable {
    @Id
    private UUID id;
    private UUID environmentId;
    private String key;
    private String value;
}
