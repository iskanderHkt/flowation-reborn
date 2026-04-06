package kg.ademity.flowation_api_modulith.flow_module.flow;

import kg.ademity.flowation_api_modulith.shared.DevContext;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class FlowService {
    private final FlowRepository flowRepository;
    private final DevContext context;

    public Flow create(String name, String description) {
        return flowRepository.save(Flow.builder()
                .ownerId(context.getDevUserId())
                .name(name)
                .description(description)
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .build());
    }

    public Flow findById(UUID id) {
        return flowRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Flow with id: " + id + " was not found"));
    }

    public List<Flow> findAll() {
        return flowRepository.findAllByOwnerId(context.getDevUserId());
    }

    public Flow update(UUID id, String name, String description) {
        Flow flowFound = flowRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Flow with id: " + id + " was not found"));

        flowFound.setName(name);
        flowFound.setDescription(description);

        return flowRepository.save(flowFound);
    }

    public void delete(UUID id) {
        flowRepository.deleteById(id);
    }

}

