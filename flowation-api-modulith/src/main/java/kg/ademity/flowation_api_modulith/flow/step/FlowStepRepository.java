package kg.ademity.flowation_api_modulith.flow.step;

import org.springframework.data.repository.CrudRepository;

import java.util.List;
import java.util.UUID;

public interface FlowStepRepository extends CrudRepository<FlowStep, UUID> {
    List<FlowStep> findAllByFlowIdOrderByStepOrder(UUID flowId);
    List<FlowStep> findAllByOperationIdAndBinding(UUID operationId, Binding binding);
    List<FlowStep> findAllByNestedFlowId(UUID nestedFlowId);
}
