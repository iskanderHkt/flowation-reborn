package kg.ademity.flowation_api_modulith.batch.run;

import kg.ademity.flowation_api_modulith.batch.run.dto.BatchRunResponse;
import kg.ademity.flowation_api_modulith.shared.PageResult;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/batches/{batchId}/runs")
@RequiredArgsConstructor
public class BatchRunController {

    private final BatchRunService batchRunService;

    @PostMapping
    public ResponseEntity<Map<String, UUID>> start(@PathVariable UUID batchId) {
        BatchRun run = batchRunService.start(batchId);
        return ResponseEntity.accepted().body(Map.of("runId", run.getId(), "batchId", batchId));
    }

    @GetMapping
    public ResponseEntity<PageResult<BatchRunResponse>> getHistory(
            @PathVariable UUID batchId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(batchRunService.getHistory(batchId, page, size));
    }

    @GetMapping("/{runId}")
    public ResponseEntity<BatchRunResponse> getRunById(
            @PathVariable UUID batchId,
            @PathVariable UUID runId) {
        return ResponseEntity.ok(batchRunService.getRunById(batchId, runId));
    }
}
