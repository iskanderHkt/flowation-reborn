# Scheduling — план реализации

**Стек:** Spring Boot 4.0.4 · Java 21 · Quartz 2.5 · Spring Data JDBC · PostgreSQL 16

---

## Обзор архитектуры

```
POST /api/schedules
        │
        ▼
ScheduleController
        │
        ▼
ScheduleService ──► сохраняет в таблицу `schedules` (наша бизнес-таблица)
        │
        ▼
Quartz Scheduler ──► сохраняет Job+Trigger в QRTZ_* таблицы
        │
        │  (в нужное время по cron)
        ▼
ScheduledExecutionJob.execute()
        │
        ├── targetType=OPERATION ──► InstantExecutionService.startAsync()
        ├── targetType=FLOW      ──► FlowExecutionService.startAsync()
        └── targetType=BATCH     ──► BatchRunService.start()
```

Один Job-класс на все типы — маршрутизация через `targetType` из `JobDataMap`.  
Наша таблица `schedules` — бизнес-данные (что, когда, чьё).  
QRTZ_* таблицы — технические данные Quartz (хранит сам, не трогаем руками).

---

## Шаг 1 — Зависимость в pom.xml

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-quartz</artifactId>
</dependency>
```

Версия управляется Spring Boot BOM — явно указывать не нужно.

---

## Шаг 2 — Конфигурация Quartz в application.yaml

```yaml
spring:
  quartz:
    job-store-type: jdbc          # хранить jobs в БД, а не в памяти
    jdbc:
      initialize-schema: never    # мы сами создадим таблицы через seed.sql
    properties:
      org:
        quartz:
          scheduler:
            instanceName: FlowationScheduler
            instanceId: AUTO      # уникальный ID при кластеризации
          jobStore:
            class: org.quartz.impl.jdbcjobstore.JobStoreTX
            driverDelegateClass: org.quartz.impl.jdbcjobstore.PostgreSQLDelegate
            tablePrefix: QRTZ_
            isClustered: false    # переключить на true при горизонтальном масштабировании
            clusterCheckinInterval: 20000
          threadPool:
            threadCount: 5        # виртуальные потоки — можно ставить больше, но 5 достаточно
```

---

## Шаг 3 — SQL: таблицы в db/seed.sql

### 3.1 Наша бизнес-таблица

```sql
CREATE TYPE schedule_target_type AS ENUM ('OPERATION', 'FLOW', 'BATCH');
CREATE TYPE schedule_status AS ENUM ('ACTIVE', 'PAUSED');

CREATE TABLE schedules
(
    id              UUID PRIMARY KEY             DEFAULT gen_random_uuid(),
    owner_id        UUID                NOT NULL REFERENCES users (id),
    target_type     schedule_target_type NOT NULL,
    target_id       UUID                NOT NULL,
    environment_id  UUID REFERENCES environments (id),
    cron_expression VARCHAR(120)        NOT NULL,
    status          schedule_status     NOT NULL DEFAULT 'ACTIVE',
    description     VARCHAR(500),
    created_at      TIMESTAMPTZ         NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ         NOT NULL DEFAULT now()
);

CREATE INDEX idx_schedules_owner ON schedules (owner_id);
CREATE INDEX idx_schedules_target ON schedules (target_type, target_id);
```

### 3.2 Стандартные QRTZ_* таблицы для PostgreSQL (Quartz 2.5)

Вставить в конец `db/seed.sql`:

```sql
-- Quartz JDBC JobStore tables (PostgreSQL)
CREATE TABLE QRTZ_JOB_DETAILS
(
    SCHED_NAME        VARCHAR(120) NOT NULL,
    JOB_NAME          VARCHAR(200) NOT NULL,
    JOB_GROUP         VARCHAR(200) NOT NULL,
    DESCRIPTION       VARCHAR(250),
    JOB_CLASS_NAME    VARCHAR(250) NOT NULL,
    IS_DURABLE        BOOLEAN      NOT NULL,
    IS_NONCONCURRENT  BOOLEAN      NOT NULL,
    IS_UPDATE_DATA    BOOLEAN      NOT NULL,
    REQUESTS_RECOVERY BOOLEAN      NOT NULL,
    JOB_DATA          BYTEA,
    PRIMARY KEY (SCHED_NAME, JOB_NAME, JOB_GROUP)
);

CREATE TABLE QRTZ_TRIGGERS
(
    SCHED_NAME     VARCHAR(120) NOT NULL,
    TRIGGER_NAME   VARCHAR(200) NOT NULL,
    TRIGGER_GROUP  VARCHAR(200) NOT NULL,
    JOB_NAME       VARCHAR(200) NOT NULL,
    JOB_GROUP      VARCHAR(200) NOT NULL,
    DESCRIPTION    VARCHAR(250),
    NEXT_FIRE_TIME BIGINT,
    PREV_FIRE_TIME BIGINT,
    PRIORITY       INTEGER,
    TRIGGER_STATE  VARCHAR(16)  NOT NULL,
    TRIGGER_TYPE   VARCHAR(8)   NOT NULL,
    START_TIME     BIGINT       NOT NULL,
    END_TIME       BIGINT,
    CALENDAR_NAME  VARCHAR(200),
    MISFIRE_INSTR  SMALLINT,
    JOB_DATA       BYTEA,
    PRIMARY KEY (SCHED_NAME, TRIGGER_NAME, TRIGGER_GROUP),
    FOREIGN KEY (SCHED_NAME, JOB_NAME, JOB_GROUP) REFERENCES QRTZ_JOB_DETAILS (SCHED_NAME, JOB_NAME, JOB_GROUP)
);

CREATE TABLE QRTZ_SIMPLE_TRIGGERS
(
    SCHED_NAME      VARCHAR(120) NOT NULL,
    TRIGGER_NAME    VARCHAR(200) NOT NULL,
    TRIGGER_GROUP   VARCHAR(200) NOT NULL,
    REPEAT_COUNT    BIGINT       NOT NULL,
    REPEAT_INTERVAL BIGINT       NOT NULL,
    TIMES_TRIGGERED BIGINT       NOT NULL,
    PRIMARY KEY (SCHED_NAME, TRIGGER_NAME, TRIGGER_GROUP),
    FOREIGN KEY (SCHED_NAME, TRIGGER_NAME, TRIGGER_GROUP) REFERENCES QRTZ_TRIGGERS (SCHED_NAME, TRIGGER_NAME, TRIGGER_GROUP)
);

CREATE TABLE QRTZ_CRON_TRIGGERS
(
    SCHED_NAME      VARCHAR(120) NOT NULL,
    TRIGGER_NAME    VARCHAR(200) NOT NULL,
    TRIGGER_GROUP   VARCHAR(200) NOT NULL,
    CRON_EXPRESSION VARCHAR(120) NOT NULL,
    TIME_ZONE_ID    VARCHAR(80),
    PRIMARY KEY (SCHED_NAME, TRIGGER_NAME, TRIGGER_GROUP),
    FOREIGN KEY (SCHED_NAME, TRIGGER_NAME, TRIGGER_GROUP) REFERENCES QRTZ_TRIGGERS (SCHED_NAME, TRIGGER_NAME, TRIGGER_GROUP)
);

CREATE TABLE QRTZ_SIMPROP_TRIGGERS
(
    SCHED_NAME    VARCHAR(120) NOT NULL,
    TRIGGER_NAME  VARCHAR(200) NOT NULL,
    TRIGGER_GROUP VARCHAR(200) NOT NULL,
    STR_PROP_1    VARCHAR(512),
    STR_PROP_2    VARCHAR(512),
    STR_PROP_3    VARCHAR(512),
    INT_PROP_1    INTEGER,
    INT_PROP_2    INTEGER,
    LONG_PROP_1   BIGINT,
    LONG_PROP_2   BIGINT,
    DEC_PROP_1    NUMERIC(13, 4),
    DEC_PROP_2    NUMERIC(13, 4),
    BOOL_PROP_1   BOOLEAN,
    BOOL_PROP_2   BOOLEAN,
    PRIMARY KEY (SCHED_NAME, TRIGGER_NAME, TRIGGER_GROUP),
    FOREIGN KEY (SCHED_NAME, TRIGGER_NAME, TRIGGER_GROUP) REFERENCES QRTZ_TRIGGERS (SCHED_NAME, TRIGGER_NAME, TRIGGER_GROUP)
);

CREATE TABLE QRTZ_BLOB_TRIGGERS
(
    SCHED_NAME    VARCHAR(120) NOT NULL,
    TRIGGER_NAME  VARCHAR(200) NOT NULL,
    TRIGGER_GROUP VARCHAR(200) NOT NULL,
    BLOB_DATA     BYTEA,
    PRIMARY KEY (SCHED_NAME, TRIGGER_NAME, TRIGGER_GROUP),
    FOREIGN KEY (SCHED_NAME, TRIGGER_NAME, TRIGGER_GROUP) REFERENCES QRTZ_TRIGGERS (SCHED_NAME, TRIGGER_NAME, TRIGGER_GROUP)
);

CREATE TABLE QRTZ_CALENDARS
(
    SCHED_NAME    VARCHAR(120) NOT NULL,
    CALENDAR_NAME VARCHAR(200) NOT NULL,
    CALENDAR      BYTEA        NOT NULL,
    PRIMARY KEY (SCHED_NAME, CALENDAR_NAME)
);

CREATE TABLE QRTZ_PAUSED_TRIGGER_GRPS
(
    SCHED_NAME    VARCHAR(120) NOT NULL,
    TRIGGER_GROUP VARCHAR(200) NOT NULL,
    PRIMARY KEY (SCHED_NAME, TRIGGER_GROUP)
);

CREATE TABLE QRTZ_FIRED_TRIGGERS
(
    SCHED_NAME        VARCHAR(120) NOT NULL,
    ENTRY_ID          VARCHAR(95)  NOT NULL,
    TRIGGER_NAME      VARCHAR(200) NOT NULL,
    TRIGGER_GROUP     VARCHAR(200) NOT NULL,
    INSTANCE_NAME     VARCHAR(200) NOT NULL,
    FIRED_TIME        BIGINT       NOT NULL,
    SCHED_TIME        BIGINT       NOT NULL,
    PRIORITY          INTEGER      NOT NULL,
    STATE             VARCHAR(16)  NOT NULL,
    JOB_NAME          VARCHAR(200),
    JOB_GROUP         VARCHAR(200),
    IS_NONCONCURRENT  BOOLEAN,
    REQUESTS_RECOVERY BOOLEAN,
    PRIMARY KEY (SCHED_NAME, ENTRY_ID)
);

CREATE TABLE QRTZ_SCHEDULER_STATE
(
    SCHED_NAME        VARCHAR(120) NOT NULL,
    INSTANCE_NAME     VARCHAR(200) NOT NULL,
    LAST_CHECKIN_TIME BIGINT       NOT NULL,
    CHECKIN_INTERVAL  BIGINT       NOT NULL,
    PRIMARY KEY (SCHED_NAME, INSTANCE_NAME)
);

CREATE TABLE QRTZ_LOCKS
(
    SCHED_NAME VARCHAR(120) NOT NULL,
    LOCK_NAME  VARCHAR(40)  NOT NULL,
    PRIMARY KEY (SCHED_NAME, LOCK_NAME)
);

CREATE INDEX IDX_QRTZ_J_REQ_RECOVERY ON QRTZ_JOB_DETAILS (SCHED_NAME, REQUESTS_RECOVERY);
CREATE INDEX IDX_QRTZ_J_GRP ON QRTZ_JOB_DETAILS (SCHED_NAME, JOB_GROUP);
CREATE INDEX IDX_QRTZ_T_J ON QRTZ_TRIGGERS (SCHED_NAME, JOB_NAME, JOB_GROUP);
CREATE INDEX IDX_QRTZ_T_JG ON QRTZ_TRIGGERS (SCHED_NAME, JOB_GROUP);
CREATE INDEX IDX_QRTZ_T_C ON QRTZ_TRIGGERS (SCHED_NAME, CALENDAR_NAME);
CREATE INDEX IDX_QRTZ_T_G ON QRTZ_TRIGGERS (SCHED_NAME, TRIGGER_GROUP);
CREATE INDEX IDX_QRTZ_T_STATE ON QRTZ_TRIGGERS (SCHED_NAME, TRIGGER_STATE);
CREATE INDEX IDX_QRTZ_T_NFT_STATE ON QRTZ_TRIGGERS (SCHED_NAME, TRIGGER_STATE, NEXT_FIRE_TIME);
CREATE INDEX IDX_QRTZ_T_NFT_MISFIRE ON QRTZ_TRIGGERS (SCHED_NAME, MISFIRE_INSTR, NEXT_FIRE_TIME);
CREATE INDEX IDX_QRTZ_T_NFT_ST_MISFIRE ON QRTZ_TRIGGERS (SCHED_NAME, MISFIRE_INSTR, NEXT_FIRE_TIME, TRIGGER_STATE);
CREATE INDEX IDX_QRTZ_T_NFT_ST_MISFIRE_GRP ON QRTZ_TRIGGERS (SCHED_NAME, MISFIRE_INSTR, NEXT_FIRE_TIME, TRIGGER_GROUP, TRIGGER_STATE);
CREATE INDEX IDX_QRTZ_FT_TRIG_INST_NAME ON QRTZ_FIRED_TRIGGERS (SCHED_NAME, INSTANCE_NAME);
CREATE INDEX IDX_QRTZ_FT_INST_JOB_REQ_RCVRY ON QRTZ_FIRED_TRIGGERS (SCHED_NAME, INSTANCE_NAME, REQUESTS_RECOVERY);
CREATE INDEX IDX_QRTZ_FT_J_G ON QRTZ_FIRED_TRIGGERS (SCHED_NAME, JOB_NAME, JOB_GROUP);
CREATE INDEX IDX_QRTZ_FT_JG ON QRTZ_FIRED_TRIGGERS (SCHED_NAME, JOB_GROUP);
CREATE INDEX IDX_QRTZ_FT_T_G ON QRTZ_FIRED_TRIGGERS (SCHED_NAME, TRIGGER_NAME, TRIGGER_GROUP);
CREATE INDEX IDX_QRTZ_FT_TG ON QRTZ_FIRED_TRIGGERS (SCHED_NAME, TRIGGER_GROUP);
```

---

## Шаг 4 — Пакетная структура

```
scheduling/
├── Schedule.java               — entity (Spring Data JDBC)
├── ScheduleStatus.java         — enum: ACTIVE, PAUSED
├── TargetType.java             — enum: OPERATION, FLOW, BATCH
├── ScheduleRepository.java     — интерфейс репозитория
├── ScheduleService.java        — бизнес-логика + взаимодействие с Quartz
├── ScheduleController.java     — REST API
├── job/
│   └── ScheduledExecutionJob.java   — Quartz Job
└── dto/
    ├── ScheduleCreateRequest.java
    ├── ScheduleUpdateRequest.java
    └── ScheduleResponse.java
```

Пакет: `kg.ademity.flowation_api_modulith.scheduling`

---

## Шаг 5 — Enums

```java
// TargetType.java
package kg.ademity.flowation_api_modulith.scheduling;

public enum TargetType {
    OPERATION, FLOW, BATCH
}
```

```java
// ScheduleStatus.java
package kg.ademity.flowation_api_modulith.scheduling;

public enum ScheduleStatus {
    ACTIVE, PAUSED
}
```

---

## Шаг 6 — Entity

```java
// Schedule.java
package kg.ademity.flowation_api_modulith.scheduling;

import lombok.Builder;
import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.relational.core.mapping.Table;

import java.time.Instant;
import java.util.UUID;

@Data
@Builder
@Table("schedules")
public class Schedule {

    @Id
    private UUID id;

    private UUID ownerId;
    private TargetType targetType;
    private UUID targetId;
    private UUID environmentId;       // nullable
    private String cronExpression;
    private ScheduleStatus status;
    private String description;       // nullable
    private Instant createdAt;
    private Instant updatedAt;
}
```

> **Важно:** Spring Data JDBC хранит enum как строку автоматически только если тип колонки VARCHAR.
> У нас PostgreSQL ENUM (`schedule_target_type`, `schedule_status`).
> Нужно зарегистрировать конвертеры — см. Шаг 7.

---

## Шаг 7 — Конвертеры для PostgreSQL ENUM

Spring Data JDBC не умеет из коробки читать PostgreSQL-специфичные enum-типы.
Нужно добавить конвертеры и зарегистрировать их.

```java
// SchedulingConverters.java
package kg.ademity.flowation_api_modulith.scheduling;

import org.springframework.core.convert.converter.Converter;
import org.springframework.data.convert.ReadingConverter;
import org.springframework.data.convert.WritingConverter;

public class SchedulingConverters {

    @ReadingConverter
    public static class TargetTypeReader implements Converter<String, TargetType> {
        @Override
        public TargetType convert(String source) {
            return TargetType.valueOf(source);
        }
    }

    @WritingConverter
    public static class TargetTypeWriter implements Converter<TargetType, String> {
        @Override
        public String convert(TargetType source) {
            return source.name();
        }
    }

    @ReadingConverter
    public static class ScheduleStatusReader implements Converter<String, ScheduleStatus> {
        @Override
        public ScheduleStatus convert(String source) {
            return ScheduleStatus.valueOf(source);
        }
    }

    @WritingConverter
    public static class ScheduleStatusWriter implements Converter<ScheduleStatus, String> {
        @Override
        public String convert(ScheduleStatus source) {
            return source.name();
        }
    }
}
```

Регистрация в конфиге (если уже есть `JdbcCustomConversions` бин — добавить туда):

```java
// SchedulingConfig.java
package kg.ademity.flowation_api_modulith.scheduling;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.jdbc.core.convert.JdbcCustomConversions;

import java.util.List;

@Configuration
public class SchedulingConfig {

    @Bean
    public JdbcCustomConversions jdbcCustomConversions() {
        return new JdbcCustomConversions(List.of(
            new SchedulingConverters.TargetTypeReader(),
            new SchedulingConverters.TargetTypeWriter(),
            new SchedulingConverters.ScheduleStatusReader(),
            new SchedulingConverters.ScheduleStatusWriter()
        ));
    }
}
```

> Если в проекте уже есть `JdbcCustomConversions` бин (проверить) — добавить конвертеры в существующий, не создавать второй.

---

## Шаг 8 — Repository

```java
// ScheduleRepository.java
package kg.ademity.flowation_api_modulith.scheduling;

import org.springframework.data.repository.CrudRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ScheduleRepository extends CrudRepository<Schedule, UUID> {

    List<Schedule> findAllByOwnerId(UUID ownerId);

    Optional<Schedule> findByIdAndOwnerId(UUID id, UUID ownerId);

    List<Schedule> findAllByTargetTypeAndTargetId(TargetType targetType, UUID targetId);
}
```

---

## Шаг 9 — DTOs

```java
// ScheduleCreateRequest.java
package kg.ademity.flowation_api_modulith.scheduling.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import kg.ademity.flowation_api_modulith.scheduling.TargetType;

import java.util.UUID;

public record ScheduleCreateRequest(
    @NotNull TargetType targetType,
    @NotNull UUID targetId,
    UUID environmentId,             // nullable — выполнение без env
    @NotBlank String cronExpression,
    String description
) {}
```

```java
// ScheduleUpdateRequest.java
package kg.ademity.flowation_api_modulith.scheduling.dto;

import jakarta.validation.constraints.NotBlank;

import java.util.UUID;

public record ScheduleUpdateRequest(
    UUID environmentId,
    @NotBlank String cronExpression,
    String description
) {}
```

```java
// ScheduleResponse.java
package kg.ademity.flowation_api_modulith.scheduling.dto;

import kg.ademity.flowation_api_modulith.scheduling.ScheduleStatus;
import kg.ademity.flowation_api_modulith.scheduling.TargetType;

import java.time.Instant;
import java.util.UUID;

public record ScheduleResponse(
    UUID id,
    TargetType targetType,
    UUID targetId,
    UUID environmentId,
    String cronExpression,
    ScheduleStatus status,
    String description,
    Instant createdAt,
    Instant updatedAt
) {}
```

---

## Шаг 10 — Quartz Job

```java
// ScheduledExecutionJob.java
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
@DisallowConcurrentExecution       // один экземпляр Job на scheduleId одновременно
@PersistJobDataAfterExecution      // JobDataMap сохраняется в БД после выполнения
public class ScheduledExecutionJob implements Job {

    // Quartz создаёт Job через свою фабрику — зависимости через @Autowired (не @RequiredArgsConstructor)
    @Autowired private InstantExecutionService instantExecutionService;
    @Autowired private FlowExecutionService flowExecutionService;
    @Autowired private BatchRunService batchRunService;

    public static final String KEY_SCHEDULE_ID   = "scheduleId";
    public static final String KEY_TARGET_TYPE   = "targetType";
    public static final String KEY_TARGET_ID     = "targetId";
    public static final String KEY_ENVIRONMENT_ID = "environmentId";

    @Override
    public void execute(JobExecutionContext ctx) {
        JobDataMap data = ctx.getMergedJobDataMap();

        UUID scheduleId   = UUID.fromString(data.getString(KEY_SCHEDULE_ID));
        TargetType type   = TargetType.valueOf(data.getString(KEY_TARGET_TYPE));
        UUID targetId     = UUID.fromString(data.getString(KEY_TARGET_ID));
        String envRaw     = data.getString(KEY_ENVIRONMENT_ID);
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
            // не пробрасываем — Quartz продолжит следующие срабатывания
        }
    }
}
```

> **Замечание:** `FlowExecutionService` сейчас не имеет `startAsync()` — нужно будет добавить по аналогии с `InstantExecutionService.startAsync()`.

---

## Шаг 11 — Service

```java
// ScheduleService.java
package kg.ademity.flowation_api_modulith.scheduling;

import kg.ademity.flowation_api_modulith.scheduling.dto.ScheduleCreateRequest;
import kg.ademity.flowation_api_modulith.scheduling.dto.ScheduleResponse;
import kg.ademity.flowation_api_modulith.scheduling.dto.ScheduleUpdateRequest;
import kg.ademity.flowation_api_modulith.scheduling.job.ScheduledExecutionJob;
import kg.ademity.flowation_api_modulith.shared.TenantContext;
import kg.ademity.flowation_api_modulith.shared.exception.NotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.quartz.*;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class ScheduleService {

    private final ScheduleRepository repository;
    private final Scheduler quartzScheduler;
    private final TenantContext tenantContext;

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

    // ── Quartz helpers ─────────────────────────────────────────────────────────

    private void registerQuartzJob(Schedule schedule) {
        JobDetail job = buildJobDetail(schedule);
        CronTrigger trigger = buildTrigger(schedule);

        try {
            quartzScheduler.scheduleJob(job, trigger);
        } catch (SchedulerException e) {
            throw new RuntimeException("Failed to schedule job", e);
        }
    }

    private void rescheduleQuartzJob(Schedule schedule) {
        TriggerKey tk = triggerKey(schedule.getId());
        CronTrigger newTrigger = buildTrigger(schedule);

        try {
            if (quartzScheduler.checkExists(tk)) {
                quartzScheduler.rescheduleJob(tk, newTrigger);
            } else {
                // Job мог быть удалён вручную — пересоздаём
                registerQuartzJob(schedule);
            }
        } catch (SchedulerException e) {
            throw new RuntimeException("Failed to reschedule job", e);
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
                        .withMisfireHandlingInstructionDoNothing()) // пропустить если сервер был выключен
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
            throw new kg.ademity.flowation_api_modulith.shared.exception.ValidationException(
                    "Invalid cron expression: " + expression);
        }
    }

    private Schedule findOwned(UUID id) {
        return repository.findByIdAndOwnerId(id, tenantContext.getOwnerId())
                .orElseThrow(() -> new NotFoundException("Schedule not found: " + id));
    }

    private ScheduleResponse toResponse(Schedule s) {
        return new ScheduleResponse(
                s.getId(), s.getTargetType(), s.getTargetId(),
                s.getEnvironmentId(), s.getCronExpression(),
                s.getStatus(), s.getDescription(),
                s.getCreatedAt(), s.getUpdatedAt()
        );
    }
}
```

---

## Шаг 12 — Controller

```java
// ScheduleController.java
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
```

---

## Шаг 13 — startAsync в FlowExecutionService

Сейчас `FlowExecutionService` не имеет `startAsync()`. Нужно добавить по аналогии с `InstantExecutionService`:

```java
// Добавить в FlowExecutionService.java

public UUID startAsync(UUID flowId, UUID environmentId, Map<String, Object> inputVariables) {
    List<CompiledStep> compiledSteps = flowPlanPort.compilePlan(flowId);
    if (compiledSteps.isEmpty()) {
        throw new ValidationException("Flow has no executable steps");
    }

    String flowName = flowPlanPort.getFlowName(flowId);
    Map<String, Object> executionPlan = buildExecutionPlan(flowId, flowName, compiledSteps);

    ExecutionRun run = runRepository.save(ExecutionRun.builder()
            .ownerId(tenantContext.getOwnerId())
            .runMode(RunMode.FLOW)
            .status(ExecutionStatus.PENDING)
            .flowId(flowId)
            .environmentId(environmentId)
            .executionPlan(executionPlan)
            .createdAt(Instant.now())
            .build());

    Thread.ofVirtual().start(() -> executeAsync(run, compiledSteps, flowName, environmentId, inputVariables));

    return run.getId();
}
```

> Нужно также проверить, есть ли в `FlowExecutionService` приватный метод `executeAsync` — если нет, вынести синхронное тело в него (аналогично тому, как устроен `InstantExecutionService`).

---

## Шаг 14 — Quartz + Spring DI: регистрация Job через SpringBeanJobFactory

По умолчанию Quartz создаёт Job-классы через `new`, игнорируя Spring-контейнер — `@Autowired` не сработает.
Spring Boot автоматически регистрирует `SpringBeanJobFactory` если найдёт бин `SchedulerFactoryBeanCustomizer`.
Проверь, что это работает — если нет, добавь:

```java
// В SchedulingConfig.java добавить:

@Bean
public SchedulerFactoryBeanCustomizer schedulerFactoryBeanCustomizer(ApplicationContext ctx) {
    return bean -> bean.setJobFactory(new SpringBeanJobFactory() {{
        setApplicationContext(ctx);
    }});
}
```

В Spring Boot 4.x это должно работать автоматически, но если `@Autowired` в Job не инжектится — добавляй этот бин.

---

## Шаг 15 — Cron-формат для Quartz

Quartz использует **6-7 полей** — отличается от стандартного Unix cron (5 полей):

```
┌─────────────── секунды    (0-59)
│ ┌───────────── минуты     (0-59)
│ │ ┌─────────── часы       (0-23)
│ │ │ ┌───────── день месяца (1-31)
│ │ │ │ ┌─────── месяц      (1-12 или JAN-DEC)
│ │ │ │ │ ┌───── день недели (1-7 или SUN-SAT)
│ │ │ │ │ │ ┌─── год (опционально)
│ │ │ │ │ │ │
* * * * * * *
```

Примеры:
```
0 0 9 * * ?          — каждый день в 09:00
0 0 9 ? * MON-FRI    — каждый будний день в 09:00
0 0/30 * * * ?       — каждые 30 минут
0 0 0 1 * ?          — первого числа каждого месяца в полночь
```

Если хочешь принимать от клиента стандартный 5-поле Unix cron и конвертировать —
добавь в `ScheduleService.validateCron()` конвертацию. Но проще обязать клиента
передавать Quartz-формат сразу (задокументировать в Swagger).

---

## Шаг 16 — Порядок создания файлов

1. `TargetType.java`
2. `ScheduleStatus.java`
3. `Schedule.java`
4. `SchedulingConverters.java`
5. `SchedulingConfig.java`
6. `ScheduleRepository.java`
7. `ScheduledExecutionJob.java`
8. DTOs: `ScheduleCreateRequest`, `ScheduleUpdateRequest`, `ScheduleResponse`
9. `ScheduleService.java`
10. `ScheduleController.java`
11. Добавить `startAsync()` в `FlowExecutionService`
12. Добавить таблицы в `db/seed.sql`
13. Добавить зависимость в `pom.xml`
14. Добавить конфиг в `application.yaml`

---

## Шаг 17 — Проверка работы

После запуска:

```bash
# 1. Создать расписание — операция каждую минуту для теста
curl -X POST http://localhost:2121/api/schedules \
  -H "Content-Type: application/json" \
  -d '{
    "targetType": "OPERATION",
    "targetId": "<uuid операции>",
    "environmentId": null,
    "cronExpression": "0 * * * * ?",
    "description": "тест — каждую минуту"
  }'

# 2. Проверить что запись создалась
curl http://localhost:2121/api/schedules

# 3. Через минуту — проверить историю выполнений операции
curl http://localhost:2121/api/operations/<uuid>/runs

# 4. Поставить на паузу
curl -X PATCH http://localhost:2121/api/schedules/<id>/pause

# 5. Удалить
curl -X DELETE http://localhost:2121/api/schedules/<id>
```

Также в логах при каждом срабатывании должна появляться строка:
```
[SCHEDULE] firing scheduleId=... type=OPERATION targetId=...
```

---

## Потенциальные проблемы

| Проблема | Решение |
|---|---|
| `@Autowired` в Job не работает | Добавить `SpringBeanJobFactory` бин (Шаг 14) |
| Ошибка чтения PostgreSQL ENUM | Проверить конвертеры (Шаг 7), убедиться что бин зарегистрирован |
| `JdbcCustomConversions` бин уже есть в проекте | Найти существующий, добавить конвертеры туда — два бина одного типа = конфликт |
| Flyway отключён, таблицы не создаются | Таблицы идут в `db/seed.sql`, который монтируется в docker — пересоздать контейнер |
| `startAsync` в FlowExecutionService нет | Добавить согласно Шагу 13 |
| Cron не валидируется на фронте | Добавить подсказку в UI с форматом и примерами |
