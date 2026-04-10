package kg.ademity.flowation_api_modulith.shared;

import org.springframework.stereotype.Component;

import java.util.UUID;

@Component
public final class DevContext implements TenantContext {

    private static final UUID DEV_USER_ID =
            UUID.fromString("00000000-0000-0000-0000-000000000001");

    @Override
    public UUID getOwnerId() {
        return DEV_USER_ID;
    }
}
