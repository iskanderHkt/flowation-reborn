package kg.ademity.flowation_api_modulith.environment_module;

import kg.ademity.flowation_api_modulith.environment_module.dto.EnvironmentResponse;
import kg.ademity.flowation_api_modulith.environment_module.dto.UpsertVariablesRequest;
import kg.ademity.flowation_api_modulith.shared.DevContext;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class EnvironmentService {

    private final EnvironmentRepository environmentRepository;
    private final EnvVariableRepository envVariableRepository;
    private final DevContext devContext;

    public EnvironmentResponse create(String name) {
        Environment env = environmentRepository.save(Environment.builder()
                .ownerId(devContext.getDevUserId())
                .name(name)
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .build());
        return toResponse(env, List.of());
    }

    public EnvironmentResponse findById(UUID id) {
        Environment env = environmentRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Environment not found: " + id));
        List<EnvVariable> variables = envVariableRepository.findAllByEnvironmentId(id);
        return toResponse(env, variables);
    }

    public List<EnvironmentResponse> findAll() {
        List<Environment> envs = environmentRepository.findAllByOwnerId(devContext.getDevUserId());
        return envs.stream()
                .map(env -> {
                    List<EnvVariable> vars = envVariableRepository.findAllByEnvironmentId(env.getId());
                    return toResponse(env, vars);
                })
                .toList();
    }

    public EnvironmentResponse update(UUID id, String name) {
        Environment env = environmentRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Environment not found: " + id));
        env.setName(name);
        env.setUpdatedAt(Instant.now());
        environmentRepository.save(env);
        List<EnvVariable> variables = envVariableRepository.findAllByEnvironmentId(id);
        return toResponse(env, variables);
    }

    public void delete(UUID id) {
        environmentRepository.deleteById(id);
    }

    public EnvironmentResponse upsertVariables(UUID id, List<UpsertVariablesRequest.EnvVariableEntry> entries) {
        Environment env = environmentRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Environment not found: " + id));

        envVariableRepository.deleteAllByEnvironmentId(id);

        List<EnvVariable> saved = entries.stream()
                .map(e -> envVariableRepository.save(EnvVariable.builder()
                        .environmentId(id)
                        .key(e.key())
                        .value(e.value())
                        .build()))
                .toList();

        env.setUpdatedAt(Instant.now());
        environmentRepository.save(env);

        return toResponse(env, saved);
    }

    /**
     * Loads environment variables as a flat Map for seeding the runtime context during execution.
     */
    public Map<String, Object> loadAsContext(UUID environmentId) {
        return envVariableRepository.findAllByEnvironmentId(environmentId).stream()
                .collect(Collectors.toMap(EnvVariable::getKey, EnvVariable::getValue));
    }

    private EnvironmentResponse toResponse(Environment env, List<EnvVariable> variables) {
        List<EnvironmentResponse.VariableEntry> entries = variables.stream()
                .map(v -> new EnvironmentResponse.VariableEntry(v.getId(), v.getKey(), v.getValue()))
                .toList();
        return new EnvironmentResponse(env.getId(), env.getName(), entries, env.getCreatedAt(), env.getUpdatedAt());
    }
}
