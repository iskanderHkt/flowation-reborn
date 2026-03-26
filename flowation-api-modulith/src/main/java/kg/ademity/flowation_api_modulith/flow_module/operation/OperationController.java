package kg.ademity.flowation_api_modulith.flow_module.operation;

import kg.ademity.flowation_api_modulith.flow_module.operation.dto.request.OperationCreateRequest;
import kg.ademity.flowation_api_modulith.flow_module.operation.dto.request.OperationUpdateRequest;
import kg.ademity.flowation_api_modulith.shared.DevContext;
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
    public ResponseEntity<List<Operation>> findAll() {
        return ResponseEntity.ok(service.findAll());
    }

    @GetMapping("/{id}")
    public ResponseEntity<Operation> findById(@PathVariable UUID id) {
        return ResponseEntity.ok(service.findById(id));
    }

    @PostMapping
    public ResponseEntity<Operation> create(@RequestBody OperationCreateRequest request) {
        return ResponseEntity.status(201).body(service.create(request.name(), request.config()));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Operation> update(@PathVariable UUID id, @RequestBody OperationUpdateRequest request) {
        return ResponseEntity.ok(service.update(id, request.name(), request.config()));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }


}
