package kg.ademity.flowation_api_modulith.shared;

import org.springframework.stereotype.Component;

import java.util.UUID;

@Component
public final class DevContext {

    private final UUID DEV_USER_ID;

    private DevContext() {
        DEV_USER_ID = UUID.fromString("00000000-0000-0000-0000-000000000001");
    }

    public UUID getDevUserId() {
        return DEV_USER_ID;
    }
}
