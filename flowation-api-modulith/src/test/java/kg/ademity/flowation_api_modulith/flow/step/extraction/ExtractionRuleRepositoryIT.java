package kg.ademity.flowation_api_modulith.flow.step.extraction;

import kg.ademity.flowation_api_modulith.AbstractIntegrationTest;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

import static org.assertj.core.api.Assertions.assertThat;

@Transactional
class ExtractionRuleRepositoryIT extends AbstractIntegrationTest {

    // dev user вставлен самой миграцией V1__init.sql
    private static final UUID DEV_USER_ID =
            UUID.fromString("00000000-0000-0000-0000-000000000001");

    @Autowired
    ExtractionRuleRepository ruleRepository;

    @Autowired
    JdbcTemplate jdbc;

    @Test
    @DisplayName("findAllByFlowStepIdIn() — возвращает правила для всех переданных шагов одним запросом")
    void findAllByFlowStepIdIn_returnsRulesForAllSteps() {
        // ── given ──────────────────────────────────────────────────────────────
        // операция нужна чтобы удовлетворить FK и CHECK constraint в flow_steps
        UUID operationId = UUID.randomUUID();
        jdbc.update("""
                INSERT INTO operations (id, owner_id, name, type, config_template, version)
                VALUES (?, ?, 'Test Op', 'HTTP_REQUEST', '{"type":"HTTP_REQUEST","method":"GET","url":"http://x.com"}', 0)
                """, operationId, DEV_USER_ID);

        UUID flowId = UUID.randomUUID();
        jdbc.update("""
                INSERT INTO flows (id, owner_id, name, version)
                VALUES (?, ?, 'Test Flow', 0)
                """, flowId, DEV_USER_ID);

        UUID stepId1 = UUID.randomUUID();
        UUID stepId2 = UUID.randomUUID();
        jdbc.update("""
                INSERT INTO flow_steps (id, flow_id, step_order, step_kind, binding, operation_id, on_fail)
                VALUES (?, ?, 0, 'OPERATION_STEP', 'LINKED', ?, 'STOP_FLOW')
                """, stepId1, flowId, operationId);
        jdbc.update("""
                INSERT INTO flow_steps (id, flow_id, step_order, step_kind, binding, operation_id, on_fail)
                VALUES (?, ?, 1, 'OPERATION_STEP', 'LINKED', ?, 'STOP_FLOW')
                """, stepId2, flowId, operationId);

        // по одному правилу на каждый шаг
        ruleRepository.save(ExtractionRule.builder()
                .flowStepId(stepId1)
                .sourcePath("$.userId")
                .targetVariable("userId")
                .ruleOrder(0)
                .build());
        ruleRepository.save(ExtractionRule.builder()
                .flowStepId(stepId2)
                .sourcePath("$.orderId")
                .targetVariable("orderId")
                .ruleOrder(0)
                .build());

        // ── when ───────────────────────────────────────────────────────────────
        List<ExtractionRule> result = ruleRepository.findAllByFlowStepIdIn(List.of(stepId1, stepId2));

        // ── then ───────────────────────────────────────────────────────────────
        assertThat(result).hasSize(2);

        Map<UUID, ExtractionRule> byStepId = result.stream()
                .collect(Collectors.toMap(ExtractionRule::getFlowStepId, r -> r));

        assertThat(byStepId.get(stepId1).getSourcePath()).isEqualTo("$.userId");
        assertThat(byStepId.get(stepId1).getTargetVariable()).isEqualTo("userId");

        assertThat(byStepId.get(stepId2).getSourcePath()).isEqualTo("$.orderId");
        assertThat(byStepId.get(stepId2).getTargetVariable()).isEqualTo("orderId");
    }
}
