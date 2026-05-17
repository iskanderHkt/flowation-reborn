package kg.ademity.flowation_api_modulith.scheduling;

import kg.ademity.flowation_api_modulith.batch.BatchService;
import kg.ademity.flowation_api_modulith.execution.port.FlowPlanPort;
import kg.ademity.flowation_api_modulith.execution.port.OperationPort;
import kg.ademity.flowation_api_modulith.scheduling.dto.ScheduleCreateRequest;
import kg.ademity.flowation_api_modulith.scheduling.dto.ScheduleResponse;
import kg.ademity.flowation_api_modulith.scheduling.dto.ScheduleUpdateRequest;
import kg.ademity.flowation_api_modulith.scheduling.job.ScheduledExecutionJob;
import kg.ademity.flowation_api_modulith.shared.TenantContext;
import kg.ademity.flowation_api_modulith.shared.exception.NotFoundException;
import kg.ademity.flowation_api_modulith.shared.exception.ValidationException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.quartz.*;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.Date;
import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class ScheduleService {

    private final ScheduleRepository repository;
    private final Scheduler quartzScheduler;
    private final TenantContext tenantContext;
    private final OperationPort operationPort;
    private final FlowPlanPort flowPlanPort;
    private final BatchService batchService;

    public ScheduleResponse create(ScheduleCreateRequest req) {
        validateCron(req.cronExpression());

        Schedule schedule = Schedule.builder()
                .ownerId(tenantContext.getOwnerId())
                .targetType(req.targetType())
                .targetId(req.targetId())
                .environmentId(req.environmentId())
                .cronExpression(req.cronExpression())
                .status(ScheduleStatus.ACTIVE)
                .description(req.description())
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .build();

        schedule = repository.save(schedule);
        registerQuartzJob(schedule);

        log.info("[SCHEDULE] created id={} type={} cron={}",
                schedule.getId(), schedule.getTargetType(), schedule.getCronExpression());

        return toResponse(schedule);
    }

    public List<ScheduleResponse> getAll() {
        return repository.findAllByOwnerId(tenantContext.getOwnerId())
                .stream()
                .map(this::toResponse)
                .toList();
    }

    public ScheduleResponse getById(UUID id) {
        return toResponse(findOwned(id));
    }

    public ScheduleResponse update(UUID id, ScheduleUpdateRequest req) {
        validateCron(req.cronExpression());

        Schedule schedule = findOwned(id);
        schedule.setCronExpression(req.cronExpression());
        schedule.setEnvironmentId(req.environmentId());
        schedule.setDescription(req.description());
        schedule.setUpdatedAt(Instant.now());

        schedule = repository.save(schedule);
        rescheduleQuartzJob(schedule);

        return toResponse(schedule);
    }

    public void delete(UUID id) {
        Schedule schedule = findOwned(id);
        unregisterQuartzJob(schedule.getId());
        repository.deleteById(id);
        log.info("[SCHEDULE] deleted id={}", id);
    }

    public ScheduleResponse pause(UUID id) {
        Schedule schedule = findOwned(id);
        schedule.setStatus(ScheduleStatus.PAUSED);
        schedule.setUpdatedAt(Instant.now());
        repository.save(schedule);

        try {
            quartzScheduler.pauseJob(jobKey(id));
        } catch (SchedulerException e) {
            throw new RuntimeException("Failed to pause schedule", e);
        }

        return toResponse(schedule);
    }

    public ScheduleResponse resume(UUID id) {
        Schedule schedule = findOwned(id);
        schedule.setStatus(ScheduleStatus.ACTIVE);
        schedule.setUpdatedAt(Instant.now());
        repository.save(schedule);

        try {
            quartzScheduler.resumeJob(jobKey(id));
        } catch (SchedulerException e) {
            throw new RuntimeException("Failed to resume schedule", e);
        }

        return toResponse(schedule);
    }

    // ── Quartz helpers ──────────────────────────────────────────────────────────

    private void registerQuartzJob(Schedule schedule) {
        try {
            quartzScheduler.scheduleJob(buildJobDetail(schedule), buildTrigger(schedule));
        } catch (SchedulerException e) {
            throw new RuntimeException("Failed to register quartz job", e);
        }
    }

    private void rescheduleQuartzJob(Schedule schedule) {
        TriggerKey tk = triggerKey(schedule.getId());
        try {
            if (quartzScheduler.checkExists(tk)) {
                quartzScheduler.rescheduleJob(tk, buildTrigger(schedule));
            } else {
                registerQuartzJob(schedule);
            }
        } catch (SchedulerException e) {
            throw new RuntimeException("Failed to reschedule quartz job", e);
        }
    }

    private void unregisterQuartzJob(UUID scheduleId) {
        try {
            quartzScheduler.deleteJob(jobKey(scheduleId));
        } catch (SchedulerException e) {
            log.warn("[SCHEDULE] failed to delete quartz job for {}: {}", scheduleId, e.getMessage());
        }
    }

    private JobDetail buildJobDetail(Schedule schedule) {
        JobDataMap data = new JobDataMap();
        data.put(ScheduledExecutionJob.KEY_SCHEDULE_ID,    schedule.getId().toString());
        data.put(ScheduledExecutionJob.KEY_TARGET_TYPE,    schedule.getTargetType().name());
        data.put(ScheduledExecutionJob.KEY_TARGET_ID,      schedule.getTargetId().toString());
        data.put(ScheduledExecutionJob.KEY_ENVIRONMENT_ID,
                schedule.getEnvironmentId() != null ? schedule.getEnvironmentId().toString() : null);

        return JobBuilder.newJob(ScheduledExecutionJob.class)
                .withIdentity(jobKey(schedule.getId()))
                .usingJobData(data)
                .storeDurably()
                .build();
    }

    private CronTrigger buildTrigger(Schedule schedule) {
        return TriggerBuilder.newTrigger()
                .withIdentity(triggerKey(schedule.getId()))
                .withSchedule(CronScheduleBuilder
                        .cronSchedule(schedule.getCronExpression())
                        .withMisfireHandlingInstructionDoNothing())
                .build();
    }

    private static JobKey jobKey(UUID scheduleId) {
        return JobKey.jobKey("schedule-" + scheduleId, "flowation");
    }

    private static TriggerKey triggerKey(UUID scheduleId) {
        return TriggerKey.triggerKey("trigger-" + scheduleId, "flowation");
    }

    private void validateCron(String expression) {
        if (!CronExpression.isValidExpression(expression)) {
            throw new ValidationException("Invalid cron expression: " + expression);
        }
    }

    private Schedule findOwned(UUID id) {
        return repository.findByIdAndOwnerId(id, tenantContext.getOwnerId())
                .orElseThrow(() -> new NotFoundException("Schedule not found: " + id));
    }

    private String resolveTargetName(Schedule s) {
        try {
            return switch (s.getTargetType()) {
                case OPERATION -> operationPort.findById(s.getTargetId()).getName();
                case FLOW      -> flowPlanPort.getFlowName(s.getTargetId());
                case BATCH     -> batchService.findById(s.getTargetId()).getName();
            };
        } catch (Exception e) {
            return s.getTargetId().toString();
        }
    }

    private Instant resolveNextFireTime(UUID scheduleId) {
        try {
            Trigger trigger = quartzScheduler.getTrigger(triggerKey(scheduleId));
            if (trigger == null) return null;
            Date next = trigger.getNextFireTime();
            return next != null ? next.toInstant() : null;
        } catch (SchedulerException e) {
            return null;
        }
    }

    private ScheduleResponse toResponse(Schedule s) {
        return new ScheduleResponse(
                s.getId(),
                s.getTargetType(),
                s.getTargetId(),
                resolveTargetName(s),
                s.getEnvironmentId(),
                s.getCronExpression(),
                s.getStatus(),
                s.getDescription(),
                resolveNextFireTime(s.getId()),
                s.getCreatedAt(),
                s.getUpdatedAt()
        );
    }
}
