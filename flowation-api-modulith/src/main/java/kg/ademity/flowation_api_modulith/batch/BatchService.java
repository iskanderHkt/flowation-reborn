package kg.ademity.flowation_api_modulith.batch;

import kg.ademity.flowation_api_modulith.batch.dto.*;
import kg.ademity.flowation_api_modulith.shared.TenantContext;
import kg.ademity.flowation_api_modulith.shared.exception.NotFoundException;
import kg.ademity.flowation_api_modulith.shared.exception.ValidationException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class BatchService {

    private final BatchRepository batchRepository;
    private final BatchItemRepository batchItemRepository;
    private final BatchDataRowRepository batchDataRowRepository;
    private final TenantContext tenantContext;

    public List<BatchResponse> listAll() {
        return batchRepository.findAllByOwnerIdOrderByCreatedAtDesc(tenantContext.getOwnerId())
                .stream()
                .map(this::toResponse)
                .toList();
    }

    public BatchResponse getById(UUID id) {
        return toResponse(findById(id));
    }

    public BatchResponse create(BatchCreateRequest request) {
        Batch batch = batchRepository.save(Batch.builder()
                .ownerId(tenantContext.getOwnerId())
                .name(request.name())
                .mode(request.mode())
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .build());
        return toResponse(batch);
    }

    public BatchResponse update(UUID id, BatchUpdateRequest request) {
        Batch batch = findById(id);
        batch.setName(request.name());
        batch.setUpdatedAt(Instant.now());
        return toResponse(batchRepository.save(batch));
    }

    public void delete(UUID id) {
        findById(id);
        batchRepository.deleteById(id);
    }

    @Transactional
    public BatchResponse setItems(UUID id, SetBatchItemsRequest request) {
        Batch batch = findById(id);

        if (batch.getMode() == BatchMode.DATA_DRIVEN && request.items().size() > 1) {
            throw new ValidationException("DATA_DRIVEN batch can only have one item");
        }

        batchItemRepository.deleteAllByBatchId(id);

        List<BatchItemRequest> items = request.items();
        List<BatchItem> toSave = new ArrayList<>(items.size());
        for (int i = 0; i < items.size(); i++) {
            BatchItemRequest item = items.get(i);
            toSave.add(BatchItem.builder()
                    .batchId(id)
                    .itemType(item.itemType())
                    .referenceId(item.referenceId())
                    .itemOrder(i)
                    .build());
        }
        batchItemRepository.saveAll(toSave);

        return getById(id);
    }

    @Transactional
    public BatchResponse setDataRows(UUID id, SetBatchDataRowsRequest request) {
        Batch batch = findById(id);

        if (batch.getMode() != BatchMode.DATA_DRIVEN) {
            throw new ValidationException("Only DATA_DRIVEN batches support data rows");
        }

        batchDataRowRepository.deleteAllByBatchId(id);

        List<java.util.Map<String, Object>> rows = request.rows();
        List<BatchDataRow> toSave = new ArrayList<>(rows.size());
        for (int i = 0; i < rows.size(); i++) {
            toSave.add(BatchDataRow.builder()
                    .batchId(id)
                    .rowOrder(i)
                    .variables(rows.get(i))
                    .build());
        }
        batchDataRowRepository.saveAll(toSave);

        return getById(id);
    }

    public Batch findById(UUID id) {
        return batchRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Batch not found: " + id));
    }

    public List<BatchItem> getItems(UUID batchId) {
        return batchItemRepository.findAllByBatchIdOrderByItemOrder(batchId);
    }

    public List<BatchDataRow> getDataRows(UUID batchId) {
        return batchDataRowRepository.findAllByBatchIdOrderByRowOrder(batchId);
    }

    private BatchResponse toResponse(Batch batch) {
        List<BatchItemEntry> items = batchItemRepository
                .findAllByBatchIdOrderByItemOrder(batch.getId())
                .stream()
                .map(i -> new BatchItemEntry(i.getId(), i.getItemType(), i.getReferenceId(), i.getItemOrder()))
                .toList();

        List<BatchDataRowEntry> dataRows = batchDataRowRepository
                .findAllByBatchIdOrderByRowOrder(batch.getId())
                .stream()
                .map(r -> new BatchDataRowEntry(r.getId(), r.getRowOrder(), r.getVariables()))
                .toList();

        return new BatchResponse(
                batch.getId(),
                batch.getName(),
                batch.getMode(),
                items,
                dataRows,
                batch.getCreatedAt(),
                batch.getUpdatedAt()
        );
    }
}
