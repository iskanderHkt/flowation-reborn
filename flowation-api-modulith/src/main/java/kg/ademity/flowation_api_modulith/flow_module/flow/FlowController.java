package kg.ademity.flowation_api_modulith.flow_module.flow;

import kg.ademity.flowation_api_modulith.flow_module.flow.dto.request.FlowCreateRequest;
import kg.ademity.flowation_api_modulith.flow_module.flow.dto.request.FlowUpdateRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/flows")
@RequiredArgsConstructor
public class FlowController {

    private final FlowService service;

    @GetMapping
    public ResponseEntity<List<Flow>> findAll() {
        return ResponseEntity.ok(service.findAll());
    }

    @GetMapping("/{id}")
    public ResponseEntity<Flow> findById(@PathVariable UUID id) {
        return ResponseEntity.ok(service.findById(id));
    }

    @PostMapping
    public ResponseEntity<Flow> create(@RequestBody FlowCreateRequest request) {
        return ResponseEntity.status(201).body(service.create(request.name(), request.description()));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Flow> update(@PathVariable UUID id, @RequestBody FlowUpdateRequest request) {
        return ResponseEntity.ok(service.update(id, request.name(), request.description()));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }
}
