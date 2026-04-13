package kg.ademity.flowation_api_modulith.execution.port;

import java.util.Map;
import java.util.UUID;

public interface EnvContextPort {

    /**
     * Returns environment variables as a flat Map for seeding the runtimeContext.
     * Returns an empty Map if environmentId is null.
     */
    Map<String, Object> loadContext(UUID environmentId);
}
