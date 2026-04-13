package kg.ademity.flowation_api_modulith.environment.dto;

import java.util.List;

public record UpsertVariablesRequest(List<EnvVariableEntry> variables) {
    public record EnvVariableEntry(String key, String value) {}
}
