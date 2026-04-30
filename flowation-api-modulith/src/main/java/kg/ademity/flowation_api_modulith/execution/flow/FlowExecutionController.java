package kg.ademity.flowation_api_modulith.execution.flow;

import kg.ademity.flowation_api_modulith.execution.dto.AsyncExecutionRequest;
import kg.ademity.flowation_api_modulith.execution.dto.ExecutionStartResponse;
import kg.ademity.flowation_api_modulith.execution.dto.FlowExecutionResultResponse;
import kg.ademity.flowation_api_modulith.execution.dto.StepResultResponse;
import kg.ademity.flowation_api_modulith.shared.PageResult;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/flows")
@RequiredArgsConstructor
public class FlowExecutionController {

    private final FlowExecutionService service;

    @PostMapping("/{id}/execute")
    public ResponseEntity<FlowExecutionResultResponse> execute(
            @PathVariable UUID id,
            @RequestParam(required = false) UUID environmentId) {
        return ResponseEntity.ok(service.execute(id, environmentId));
    }

    @PostMapping("/{flowId}/runs")
    public ResponseEntity<ExecutionStartResponse> startRun(
            @PathVariable UUID flowId,
            @RequestBody AsyncExecutionRequest request) {
        UUID runId = service.startAsync(flowId, request.environmentId(), request.inputVariables());
        return ResponseEntity.accepted().body(new ExecutionStartResponse(runId));
    }

    @GetMapping("/{id}/executions")
    public ResponseEntity<PageResult<FlowExecutionResultResponse>> getHistory(
            @PathVariable UUID id,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(service.getHistory(id, page, size));
    }

    @PostMapping("/{flowId}/steps/{stepId}/test")
    public ResponseEntity<StepResultResponse> testStep(
            @PathVariable UUID flowId,
            @PathVariable UUID stepId) {
        return ResponseEntity.ok(service.testStep(flowId, stepId));
    }
}
