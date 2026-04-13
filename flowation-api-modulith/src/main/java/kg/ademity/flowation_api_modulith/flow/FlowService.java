package kg.ademity.flowation_api_modulith.flow;

import kg.ademity.flowation_api_modulith.shared.TenantContext;
import kg.ademity.flowation_api_modulith.shared.exception.NotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class FlowService {
    private final FlowRepository flowRepository;
    private final TenantContext tenantContext;

    public Flow create(String name, String description) {
        return flowRepository.save(Flow.builder()
                .ownerId(tenantContext.getOwnerId())
                .name(name)
                .description(description)
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .build());
    }

    public Flow findById(UUID id) {
        return flowRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Flow", id));
    }

    public List<Flow> findAll() {
        return flowRepository.findAllByOwnerId(tenantContext.getOwnerId());
    }

    public Flow update(UUID id, String name, String description) {
        Flow flowFound = flowRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Flow", id));

        flowFound.setName(name);
        flowFound.setDescription(description);

        return flowRepository.save(flowFound);
    }

    public void delete(UUID id) {
        flowRepository.deleteById(id);
    }

}

