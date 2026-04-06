package kg.ademity.flowation_api_modulith.environment_module.dto;

import java.util.List;

public record UpsertVariablesRequest(List<EnvVariableEntry> variables) {
    public record EnvVariableEntry(String key, String value) {}
}
