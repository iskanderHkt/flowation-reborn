package kg.ademity.flowation_api_modulith.environment.adapter;

import kg.ademity.flowation_api_modulith.environment.EnvironmentService;
import kg.ademity.flowation_api_modulith.execution.port.EnvContextPort;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class EnvContextAdapter implements EnvContextPort {

    private final EnvironmentService environmentService;

    @Override
    public Map<String, Object> loadContext(UUID environmentId) {
        if (environmentId == null) return Map.of();
        return environmentService.loadAsContext(environmentId);
    }
}
