package kg.ademity.flowation_api_modulith.scheduling;

import jakarta.validation.Valid;
import kg.ademity.flowation_api_modulith.scheduling.dto.ScheduleCreateRequest;
import kg.ademity.flowation_api_modulith.scheduling.dto.ScheduleResponse;
import kg.ademity.flowation_api_modulith.scheduling.dto.ScheduleUpdateRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/schedules")
@RequiredArgsConstructor
public class ScheduleController {

    private final ScheduleService service;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ScheduleResponse create(@Valid @RequestBody ScheduleCreateRequest req) {
        return service.create(req);
    }

    @GetMapping
    public List<ScheduleResponse> getAll() {
        return service.getAll();
    }

    @GetMapping("/{id}")
    public ScheduleResponse getById(@PathVariable UUID id) {
        return service.getById(id);
    }

    @PutMapping("/{id}")
    public ScheduleResponse update(@PathVariable UUID id,
                                   @Valid @RequestBody ScheduleUpdateRequest req) {
        return service.update(id, req);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable UUID id) {
        service.delete(id);
    }

    @PatchMapping("/{id}/pause")
    public ScheduleResponse pause(@PathVariable UUID id) {
        return service.pause(id);
    }

    @PatchMapping("/{id}/resume")
    public ScheduleResponse resume(@PathVariable UUID id) {
        return service.resume(id);
    }
}
