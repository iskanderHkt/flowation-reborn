package kg.ademity.flowation_api_modulith.shared.exception;

import java.util.UUID;

public class NotFoundException extends FlowationException {
    public NotFoundException(String entityName, UUID id) {
        super(entityName + " with id: " + id + " was not found");
    }

    public NotFoundException(String message) {
        super(message);
    }
}
