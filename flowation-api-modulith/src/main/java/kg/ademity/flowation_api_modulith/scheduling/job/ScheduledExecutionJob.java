package kg.ademity.flowation_api_modulith.scheduling.job;

import kg.ademity.flowation_api_modulith.batch.run.BatchRunService;
import kg.ademity.flowation_api_modulith.execution.InstantExecutionService;
import kg.ademity.flowation_api_modulith.execution.flow.FlowExecutionService;
import kg.ademity.flowation_api_modulith.scheduling.TargetType;
import lombok.extern.slf4j.Slf4j;
import org.quartz.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.UUID;

@Slf4j
@Component
@DisallowConcurrentExecution
@PersistJobDataAfterExecution
public class ScheduledExecutionJob implements Job {

    public static final String KEY_SCHEDULE_ID    = "scheduleId";
    public static final String KEY_TARGET_TYPE    = "targetType";
    public static final String KEY_TARGET_ID      = "targetId";
    public static final String KEY_ENVIRONMENT_ID = "environmentId";

    @Autowired private InstantExecutionService instantExecutionService;
    @Autowired private FlowExecutionService flowExecutionService;
    @Autowired private BatchRunService batchRunService;

    @Override
    public void execute(JobExecutionContext ctx) {
        JobDataMap data = ctx.getMergedJobDataMap();

        UUID scheduleId    = UUID.fromString(data.getString(KEY_SCHEDULE_ID));
        TargetType type    = TargetType.valueOf(data.getString(KEY_TARGET_TYPE));
        UUID targetId      = UUID.fromString(data.getString(KEY_TARGET_ID));
        String envRaw      = data.getString(KEY_ENVIRONMENT_ID);
        UUID environmentId = envRaw != null ? UUID.fromString(envRaw) : null;

        log.info("[SCHEDULE] firing scheduleId={} type={} targetId={}", scheduleId, type, targetId);

        try {
            switch (type) {
                case OPERATION -> instantExecutionService.startAsync(targetId, environmentId, Map.of());
                case FLOW      -> flowExecutionService.startAsync(targetId, environmentId, Map.of());
                case BATCH     -> batchRunService.start(targetId, environmentId);
            }
        } catch (Exception e) {
            log.error("[SCHEDULE] scheduleId={} failed: {}", scheduleId, e.getMessage(), e);
        }
    }
}
