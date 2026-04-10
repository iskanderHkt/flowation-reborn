package kg.ademity.flowation_api_modulith.flow_module.flow.step.extraction;

import kg.ademity.flowation_api_modulith.flow_module.flow.step.FlowStepService;
import kg.ademity.flowation_api_modulith.flow_module.flow.step.extraction.dto.request.ExtractionRuleCreateRequest;
import kg.ademity.flowation_api_modulith.flow_module.flow.step.extraction.dto.request.ExtractionRuleUpdateRequest;
import kg.ademity.flowation_api_modulith.shared.exception.NotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ExtractionRuleService {

    private final ExtractionRuleRepository ruleRepository;
    private final FlowStepService flowStepService;

    public ExtractionRule addRule(UUID flowId, UUID stepId, ExtractionRuleCreateRequest request) {
        // verify step exists and belongs to flow
        flowStepService.getStep(flowId, stepId);

        // auto-assign ruleOrder = last + 1
        List<ExtractionRule> existing = ruleRepository.findAllByFlowStepIdOrderByRuleOrder(stepId);
        int nextOrder = existing.isEmpty() ? 0 : existing.getLast().getRuleOrder() + 1;

        ExtractionRule rule = ExtractionRule.builder()
                .flowStepId(stepId)
                .sourcePath(request.sourcePath())
                .targetVariable(request.targetVariable())
                .ruleOrder(nextOrder)
                .build();

        return ruleRepository.save(rule);
    }

    public ExtractionRule updateRule(UUID flowId, UUID stepId, UUID ruleId, ExtractionRuleUpdateRequest request) {
        // verify step belongs to flow
        flowStepService.getStep(flowId, stepId);

        ExtractionRule rule = ruleRepository.findById(ruleId)
                .filter(r -> r.getFlowStepId().equals(stepId))
                .orElseThrow(() -> new NotFoundException("Rule " + ruleId + " not found in step " + stepId));

        rule.setSourcePath(request.sourcePath());
        rule.setTargetVariable(request.targetVariable());

        return ruleRepository.save(rule);
    }

    public void deleteRule(UUID flowId, UUID stepId, UUID ruleId) {
        flowStepService.getStep(flowId, stepId);

        ExtractionRule rule = ruleRepository.findById(ruleId)
                .filter(r -> r.getFlowStepId().equals(stepId))
                .orElseThrow(() -> new NotFoundException("Rule " + ruleId + " not found in step " + stepId));

        ruleRepository.delete(rule);
    }

    public List<ExtractionRule> getRulesByStepId(UUID stepId) {
        return ruleRepository.findAllByFlowStepIdOrderByRuleOrder(stepId);
    }
}
