package kg.ademity.flowation_api_modulith.execution;

import kg.ademity.flowation_api_modulith.execution.dto.AsyncExecutionRequest;
import kg.ademity.flowation_api_modulith.execution.dto.ExecutionResultResponse;
import kg.ademity.flowation_api_modulith.execution.dto.ExecutionStartResponse;
import kg.ademity.flowation_api_modulith.shared.PageResult;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/operations")
@RequiredArgsConstructor
public class InstantExecutionController {

    private final InstantExecutionService executionService;

    @PostMapping("/{id}/execute")
    public ResponseEntity<ExecutionResultResponse> execute(
            @PathVariable UUID id,
            @RequestParam(required = false) UUID environmentId) {
        return ResponseEntity.ok(executionService.execute(id, environmentId));
    }

    @PostMapping("/{operationId}/runs")
    public ResponseEntity<ExecutionStartResponse> startRun(
            @PathVariable UUID operationId,
            @RequestBody AsyncExecutionRequest request) {
        UUID runId = executionService.startAsync(operationId, request.environmentId(), request.inputVariables());
        return ResponseEntity.accepted().body(new ExecutionStartResponse(runId));
    }

    @GetMapping("/{id}/executions")
    public ResponseEntity<PageResult<ExecutionResultResponse>> getHistory(
            @PathVariable UUID id,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(executionService.getHistory(id, page, size));
    }
}
