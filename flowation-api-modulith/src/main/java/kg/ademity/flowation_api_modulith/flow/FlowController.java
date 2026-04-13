package kg.ademity.flowation_api_modulith.flow;

import kg.ademity.flowation_api_modulith.flow.dto.request.FlowCreateRequest;
import kg.ademity.flowation_api_modulith.flow.dto.request.FlowUpdateRequest;
import kg.ademity.flowation_api_modulith.flow.dto.response.FlowResponse;
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
    public ResponseEntity<List<FlowResponse>> findAll() {
        return ResponseEntity.ok(service.findAll().stream().map(FlowResponse::from).toList());
    }

    @GetMapping("/{id}")
    public ResponseEntity<FlowResponse> findById(@PathVariable UUID id) {
        return ResponseEntity.ok(FlowResponse.from(service.findById(id)));
    }

    @PostMapping
    public ResponseEntity<FlowResponse> create(@RequestBody FlowCreateRequest request) {
        return ResponseEntity.status(201).body(FlowResponse.from(service.create(request.name(), request.description())));
    }

    @PutMapping("/{id}")
    public ResponseEntity<FlowResponse> update(@PathVariable UUID id, @RequestBody FlowUpdateRequest request) {
        return ResponseEntity.ok(FlowResponse.from(service.update(id, request.name(), request.description())));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }
}
