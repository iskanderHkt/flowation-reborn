package kg.ademity.flowation_api_modulith.flow.step.extraction;

import kg.ademity.flowation_api_modulith.flow.step.extraction.dto.request.ExtractionRuleCreateRequest;
import kg.ademity.flowation_api_modulith.flow.step.extraction.dto.request.ExtractionRuleUpdateRequest;
import kg.ademity.flowation_api_modulith.flow.step.extraction.dto.response.ExtractionRuleResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/flows/{flowId}/steps/{stepId}/rules")
@RequiredArgsConstructor
public class ExtractionRuleController {

    private final ExtractionRuleService service;

    @GetMapping
    public ResponseEntity<List<ExtractionRuleResponse>> getRules(
            @PathVariable UUID flowId,
            @PathVariable UUID stepId) {
        return ResponseEntity.ok(service.getRulesByStepId(stepId).stream().map(ExtractionRuleResponse::from).toList());
    }

    @PostMapping
    public ResponseEntity<ExtractionRuleResponse> create(
            @PathVariable UUID flowId,
            @PathVariable UUID stepId,
            @RequestBody ExtractionRuleCreateRequest request) {
        return ResponseEntity.status(201).body(ExtractionRuleResponse.from(service.addRule(flowId, stepId, request)));
    }

    @PutMapping("/{ruleId}")
    public ResponseEntity<ExtractionRuleResponse> update(
            @PathVariable UUID flowId,
            @PathVariable UUID stepId,
            @PathVariable UUID ruleId,
            @RequestBody ExtractionRuleUpdateRequest request) {
        return ResponseEntity.ok(ExtractionRuleResponse.from(service.updateRule(flowId, stepId, ruleId, request)));
    }

    @DeleteMapping("/{ruleId}")
    public ResponseEntity<Void> delete(
            @PathVariable UUID flowId,
            @PathVariable UUID stepId,
            @PathVariable UUID ruleId) {
        service.deleteRule(flowId, stepId, ruleId);
        return ResponseEntity.noContent().build();
    }
}
