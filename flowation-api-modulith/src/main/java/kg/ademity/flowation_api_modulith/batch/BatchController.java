package kg.ademity.flowation_api_modulith.batch;

import kg.ademity.flowation_api_modulith.batch.dto.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/batches")
@RequiredArgsConstructor
public class BatchController {

    private final BatchService batchService;

    @GetMapping
    public ResponseEntity<List<BatchResponse>> listAll() {
        return ResponseEntity.ok(batchService.listAll());
    }

    @GetMapping("/{id}")
    public ResponseEntity<BatchResponse> getById(@PathVariable UUID id) {
        return ResponseEntity.ok(batchService.getById(id));
    }

    @PostMapping
    public ResponseEntity<BatchResponse> create(@RequestBody BatchCreateRequest request) {
        return ResponseEntity.status(201).body(batchService.create(request));
    }

    @PutMapping("/{id}")
    public ResponseEntity<BatchResponse> update(@PathVariable UUID id, @RequestBody BatchUpdateRequest request) {
        return ResponseEntity.ok(batchService.update(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        batchService.delete(id);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/{id}/items")
    public ResponseEntity<BatchResponse> setItems(@PathVariable UUID id, @RequestBody SetBatchItemsRequest request) {
        return ResponseEntity.ok(batchService.setItems(id, request));
    }

    @PutMapping("/{id}/data-rows")
    public ResponseEntity<BatchResponse> setDataRows(@PathVariable UUID id, @RequestBody SetBatchDataRowsRequest request) {
        return ResponseEntity.ok(batchService.setDataRows(id, request));
    }
}
