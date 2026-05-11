package kg.ademity.flowation_api_modulith.batch.run;

import kg.ademity.flowation_api_modulith.batch.run.dto.BatchRunResponse;
import kg.ademity.flowation_api_modulith.execution.dto.AsyncExecutionRequest;
import kg.ademity.flowation_api_modulith.shared.PageResult;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/batches/{batchId}/runs")
@RequiredArgsConstructor
public class BatchRunController {

    private final BatchRunService batchRunService;
    private final BatchRunStreamService batchRunStreamService;

    @PostMapping
    public ResponseEntity<Map<String, UUID>> start(
            @PathVariable UUID batchId,
            @RequestBody(required = false) AsyncExecutionRequest request) {
        UUID environmentId = request != null ? request.environmentId() : null;
        BatchRun run = batchRunService.start(batchId, environmentId);
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

    @GetMapping(value = "/{runId}/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter stream(
            @PathVariable UUID batchId,
            @PathVariable UUID runId) {
        return batchRunStreamService.stream(batchId, runId);
    }
}
