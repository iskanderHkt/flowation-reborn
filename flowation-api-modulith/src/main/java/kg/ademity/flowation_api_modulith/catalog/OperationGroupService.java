package kg.ademity.flowation_api_modulith.catalog;

import kg.ademity.flowation_api_modulith.catalog.dto.request.GroupCreateRequest;
import kg.ademity.flowation_api_modulith.catalog.dto.request.GroupUpdateRequest;
import kg.ademity.flowation_api_modulith.catalog.dto.response.GroupResponse;
import kg.ademity.flowation_api_modulith.shared.TenantContext;
import kg.ademity.flowation_api_modulith.shared.exception.NotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class OperationGroupService {

    private final OperationGroupRepository groupRepository;
    private final OperationRepository operationRepository;
    private final TenantContext tenantContext;

    public List<GroupResponse> findAll() {
        return groupRepository.findAllByOwnerIdOrderByName(tenantContext.getOwnerId())
                .stream()
                .map(GroupResponse::from)
                .toList();
    }

    public GroupResponse create(GroupCreateRequest request) {
        OperationGroup group = groupRepository.save(OperationGroup.builder()
                .ownerId(tenantContext.getOwnerId())
                .name(request.name())
                .createdAt(Instant.now())
                .build());
        return GroupResponse.from(group);
    }

    public GroupResponse update(UUID id, GroupUpdateRequest request) {
        OperationGroup group = groupRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("OperationGroup", id));
        group.setName(request.name());
        return GroupResponse.from(groupRepository.save(group));
    }

    @Transactional
    public void delete(UUID id) {
        groupRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("OperationGroup", id));

        // Unassign all operations from this group before deleting
        operationRepository.findAllByOwnerIdAndDeletedAtIsNull(tenantContext.getOwnerId())
                .stream()
                .filter(op -> id.equals(op.getGroupId()))
                .forEach(op -> {
                    op.setGroupId(null);
                    operationRepository.save(op);
                });

        groupRepository.deleteById(id);
    }
}
