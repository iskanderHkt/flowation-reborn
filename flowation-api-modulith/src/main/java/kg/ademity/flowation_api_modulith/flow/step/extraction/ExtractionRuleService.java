package kg.ademity.flowation_api_modulith.flow.step.extraction;

import kg.ademity.flowation_api_modulith.flow.step.FlowStepService;
import kg.ademity.flowation_api_modulith.flow.step.extraction.dto.request.ExtractionRuleCreateRequest;
import kg.ademity.flowation_api_modulith.flow.step.extraction.dto.request.ExtractionRuleUpdateRequest;
import kg.ademity.flowation_api_modulith.shared.CacheNames;
import kg.ademity.flowation_api_modulith.shared.exception.NotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ExtractionRuleService {

    private final ExtractionRuleRepository ruleRepository;
    private final FlowStepService flowStepService;

    @CacheEvict(value = CacheNames.COMPILED_FLOWS, key = "#flowId")
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

    @CacheEvict(value = CacheNames.COMPILED_FLOWS, key = "#flowId")
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

    @CacheEvict(value = CacheNames.COMPILED_FLOWS, key = "#flowId")
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

    /**
     * Bulk load — one query for all step IDs instead of N queries.
     * Returns map: stepId → rules (sorted by ruleOrder in memory).
     */
    public Map<UUID, List<ExtractionRule>> getRulesByStepIds(Collection<UUID> stepIds) {
        if (stepIds.isEmpty()) return Map.of();
        return ruleRepository.findAllByFlowStepIdIn(stepIds)
                .stream()
                .sorted(Comparator.comparingInt(ExtractionRule::getRuleOrder))
                .collect(Collectors.groupingBy(ExtractionRule::getFlowStepId));
    }
}
