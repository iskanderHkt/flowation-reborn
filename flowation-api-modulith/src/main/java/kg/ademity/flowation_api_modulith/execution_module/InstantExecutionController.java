package kg.ademity.flowation_api_modulith.execution_module;

import kg.ademity.flowation_api_modulith.execution_module.dto.ExecutionResultResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
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

    @GetMapping("/{id}/executions")
    public ResponseEntity<List<ExecutionResultResponse>> getHistory(@PathVariable UUID id) {
        return ResponseEntity.ok(executionService.getHistory(id));
    }
}
