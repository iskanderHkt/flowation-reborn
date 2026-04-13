package kg.ademity.flowation_api_modulith.execution.flow;

import kg.ademity.flowation_api_modulith.execution.dto.FlowExecutionResultResponse;
import kg.ademity.flowation_api_modulith.execution.dto.StepResultResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
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

    @GetMapping("/{id}/executions")
    public ResponseEntity<List<FlowExecutionResultResponse>> getHistory(@PathVariable UUID id) {
        return ResponseEntity.ok(service.getHistory(id));
    }

    @PostMapping("/{flowId}/steps/{stepId}/test")
    public ResponseEntity<StepResultResponse> testStep(
            @PathVariable UUID flowId,
            @PathVariable UUID stepId) {
        return ResponseEntity.ok(service.testStep(flowId, stepId));
    }
}
