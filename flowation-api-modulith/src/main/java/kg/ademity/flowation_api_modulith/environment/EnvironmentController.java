package kg.ademity.flowation_api_modulith.environment;

import kg.ademity.flowation_api_modulith.environment.dto.EnvironmentCreateRequest;
import kg.ademity.flowation_api_modulith.environment.dto.EnvironmentResponse;
import kg.ademity.flowation_api_modulith.environment.dto.EnvironmentUpdateRequest;
import kg.ademity.flowation_api_modulith.environment.dto.UpsertVariablesRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/environments")
@RequiredArgsConstructor
public class EnvironmentController {

    private final EnvironmentService service;

    @GetMapping
    public ResponseEntity<List<EnvironmentResponse>> findAll() {
        return ResponseEntity.ok(service.findAll());
    }

    @GetMapping("/{id}")
    public ResponseEntity<EnvironmentResponse> findById(@PathVariable UUID id) {
        return ResponseEntity.ok(service.findById(id));
    }

    @PostMapping
    public ResponseEntity<EnvironmentResponse> create(@RequestBody EnvironmentCreateRequest request) {
        return ResponseEntity.status(201).body(service.create(request.name()));
    }

    @PutMapping("/{id}")
    public ResponseEntity<EnvironmentResponse> update(@PathVariable UUID id, @RequestBody EnvironmentUpdateRequest request) {
        return ResponseEntity.ok(service.update(id, request.name()));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/{id}/variables")
    public ResponseEntity<EnvironmentResponse> upsertVariables(
            @PathVariable UUID id,
            @RequestBody UpsertVariablesRequest request
    ) {
        return ResponseEntity.ok(service.upsertVariables(id, request.variables()));
    }
}
