package kg.ademity.flowation_api_modulith.flow.step.extraction;

import org.springframework.data.repository.CrudRepository;

import java.util.List;
import java.util.UUID;

public interface ExtractionRuleRepository extends CrudRepository<ExtractionRule, UUID> {
    List<ExtractionRule> findAllByFlowStepIdOrderByRuleOrder(UUID flowStepId);
}
