package kg.ademity.flowation_api_modulith.flow_module.flow.step;

import kg.ademity.flowation_api_modulith.flow_module.flow.step.dto.request.FlowStepCreateRequest;
import kg.ademity.flowation_api_modulith.flow_module.flow.step.dto.request.FlowStepUpdateRequest;
import kg.ademity.flowation_api_modulith.flow_module.flow.step.dto.request.ReorderEntry;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/flows/{flowId}/steps")
@RequiredArgsConstructor
public class FlowStepController {

    private final FlowStepService service;

    @GetMapping
    public ResponseEntity<List<FlowStep>> getAllSteps(@PathVariable UUID flowId) {
        return ResponseEntity.ok(service.getAllSteps(flowId));
    }

    @GetMapping("/{stepId}")
    public ResponseEntity<FlowStep> getStep(
            @PathVariable UUID flowId,
            @PathVariable UUID stepId) {
        return ResponseEntity.ok(service.getStep(flowId, stepId));
    }

    @PostMapping
    public ResponseEntity<FlowStep> addStep(
            @PathVariable UUID flowId,
            @RequestBody FlowStepCreateRequest request) {
        return ResponseEntity.status(201).body(service.addStep(flowId, request));
    }

    @PutMapping("/{stepId}")
    public ResponseEntity<FlowStep> updateStep(
            @PathVariable UUID flowId,
            @PathVariable UUID stepId,
            @RequestBody FlowStepUpdateRequest request) {
        return ResponseEntity.ok(service.updateStep(flowId, stepId, request));
    }

    @DeleteMapping("/{stepId}")
    public ResponseEntity<Void> deleteStep(
            @PathVariable UUID flowId,
            @PathVariable UUID stepId) {
        service.deleteStep(flowId, stepId);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/reorder")
    public ResponseEntity<Void> reorderSteps(
            @PathVariable UUID flowId,
            @RequestBody List<ReorderEntry> entries) {
        service.reorderSteps(flowId, entries);
        return ResponseEntity.ok().build();
    }
}
