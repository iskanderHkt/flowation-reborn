package kg.ademity.flowation_api_modulith.environment;

import kg.ademity.flowation_api_modulith.environment.dto.EnvironmentResponse;
import kg.ademity.flowation_api_modulith.environment.dto.UpsertVariablesRequest;
import kg.ademity.flowation_api_modulith.shared.TenantContext;
import kg.ademity.flowation_api_modulith.shared.exception.NotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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
    private final TenantContext tenantContext;

    public EnvironmentResponse create(String name) {
        Environment env = environmentRepository.save(Environment.builder()
                .ownerId(tenantContext.getOwnerId())
                .name(name)
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .build());
        return toResponse(env, List.of());
    }

    public EnvironmentResponse findById(UUID id) {
        Environment env = environmentRepository.findByIdAndDeletedAtIsNull(id)
                .orElseThrow(() -> new NotFoundException("Environment", id));
        List<EnvVariable> variables = envVariableRepository.findAllByEnvironmentId(id);
        return toResponse(env, variables);
    }

    public List<EnvironmentResponse> findAll() {
        List<Environment> envs = environmentRepository.findAllByOwnerIdAndDeletedAtIsNull(tenantContext.getOwnerId());
        if (envs.isEmpty()) return List.of();

        List<UUID> envIds = envs.stream().map(Environment::getId).toList();
        Map<UUID, List<EnvVariable>> varsByEnvId = envVariableRepository.findAllByEnvironmentIdIn(envIds)
                .stream()
                .collect(Collectors.groupingBy(EnvVariable::getEnvironmentId));

        return envs.stream()
                .map(env -> toResponse(env, varsByEnvId.getOrDefault(env.getId(), List.of())))
                .toList();
    }

    public EnvironmentResponse update(UUID id, String name) {
        Environment env = environmentRepository.findByIdAndDeletedAtIsNull(id)
                .orElseThrow(() -> new NotFoundException("Environment", id));
        env.setName(name);
        env.setUpdatedAt(Instant.now());
        environmentRepository.save(env);
        List<EnvVariable> variables = envVariableRepository.findAllByEnvironmentId(id);
        return toResponse(env, variables);
    }

    public void delete(UUID id) {
        Environment env = environmentRepository.findByIdAndDeletedAtIsNull(id)
                .orElseThrow(() -> new NotFoundException("Environment", id));
        env.setDeletedAt(Instant.now());
        environmentRepository.save(env);
    }

    @Transactional
    public EnvironmentResponse upsertVariables(UUID id, List<UpsertVariablesRequest.EnvVariableEntry> entries) {
        Environment env = environmentRepository.findByIdAndDeletedAtIsNull(id)
                .orElseThrow(() -> new NotFoundException("Environment", id));

        envVariableRepository.deleteAllByEnvironmentId(id);

        List<EnvVariable> toSave = entries.stream()
                .map(e -> EnvVariable.builder()
                        .environmentId(id)
                        .key(e.key())
                        .value(e.value())
                        .build())
                .toList();
        List<EnvVariable> saved = (List<EnvVariable>) envVariableRepository.saveAll(toSave);

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
