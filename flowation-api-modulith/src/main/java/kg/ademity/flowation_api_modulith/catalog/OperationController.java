package kg.ademity.flowation_api_modulith.catalog;

import kg.ademity.flowation_api_modulith.catalog.dto.request.OperationCreateRequest;
import kg.ademity.flowation_api_modulith.catalog.dto.request.OperationUpdateRequest;
import kg.ademity.flowation_api_modulith.catalog.dto.response.OperationResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/operations")
@RequiredArgsConstructor
public class OperationController {

    private final OperationService service;

    @GetMapping()
    public ResponseEntity<List<OperationResponse>> findAll() {
        return ResponseEntity.ok(service.findAll().stream().map(OperationResponse::from).toList());
    }

    @GetMapping("/{id}")
    public ResponseEntity<OperationResponse> findById(@PathVariable UUID id) {
        return ResponseEntity.ok(OperationResponse.from(service.findById(id)));
    }

    @PostMapping
    public ResponseEntity<OperationResponse> create(@RequestBody OperationCreateRequest request) {
        return ResponseEntity.status(201).body(OperationResponse.from(service.create(request.name(), request.config())));
    }

    @PutMapping("/{id}")
    public ResponseEntity<OperationResponse> update(@PathVariable UUID id, @RequestBody OperationUpdateRequest request) {
        return ResponseEntity.ok(OperationResponse.from(service.update(id, request.name(), request.config())));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }
}
