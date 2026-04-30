package kg.ademity.flowation_api_modulith.catalog;

import kg.ademity.flowation_api_modulith.catalog.dto.request.GroupCreateRequest;
import kg.ademity.flowation_api_modulith.catalog.dto.request.GroupUpdateRequest;
import kg.ademity.flowation_api_modulith.catalog.dto.response.GroupResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/operation-groups")
@RequiredArgsConstructor
public class OperationGroupController {

    private final OperationGroupService service;

    @GetMapping
    public ResponseEntity<List<GroupResponse>> findAll() {
        return ResponseEntity.ok(service.findAll());
    }

    @PostMapping
    public ResponseEntity<GroupResponse> create(@RequestBody GroupCreateRequest request) {
        return ResponseEntity.status(201).body(service.create(request));
    }

    @PutMapping("/{id}")
    public ResponseEntity<GroupResponse> update(@PathVariable UUID id, @RequestBody GroupUpdateRequest request) {
        return ResponseEntity.ok(service.update(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }
}
