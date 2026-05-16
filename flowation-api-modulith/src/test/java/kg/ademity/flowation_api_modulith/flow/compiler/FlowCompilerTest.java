package kg.ademity.flowation_api_modulith.flow.compiler;

import kg.ademity.flowation_api_modulith.catalog.Operation;
import kg.ademity.flowation_api_modulith.catalog.OperationService;
import kg.ademity.flowation_api_modulith.catalog.OperationType;
import kg.ademity.flowation_api_modulith.catalog.config.HttpOperationConfig;
import kg.ademity.flowation_api_modulith.flow.Flow;
import kg.ademity.flowation_api_modulith.flow.FlowService;
import kg.ademity.flowation_api_modulith.flow.step.Binding;
import kg.ademity.flowation_api_modulith.flow.step.FlowStep;
import kg.ademity.flowation_api_modulith.flow.step.FlowStepService;
import kg.ademity.flowation_api_modulith.flow.step.OnFailStrategy;
import kg.ademity.flowation_api_modulith.flow.step.StepKind;
import kg.ademity.flowation_api_modulith.flow.step.extraction.ExtractionRuleService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class FlowCompilerTest {

    @Mock
    FlowStepService flowStepService;
    @Mock
    FlowService flowService;
    @Mock
    OperationService operationService;
    @Mock
    ExtractionRuleService extractionRuleService;

    @InjectMocks
    FlowCompiler compiler;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(compiler, "maxNestingDepth", 10);
    }

    @Test
    @DisplayName("compile() — два LINKED шага возвращают плоский список из двух CompiledStep")
    void compile_twoLinkedSteps_returnsCorrectCompiledList() {
        // ── given ──────────────────────────────────────────────────────────────
        UUID flowId = UUID.randomUUID();
        Flow flow = Flow.builder()
                .id(flowId)
                .name("Test Flow")
                .build();

        UUID operationId1 = UUID.randomUUID();
        UUID operationId2 = UUID.randomUUID();

        FlowStep step1 = FlowStep.builder()
                .id(UUID.randomUUID())
                .flowId(flowId)
                .stepKind(StepKind.OPERATION_STEP)
                .binding(Binding.LINKED)
                .operationId(operationId1)
                .stepOrder(0)
                .onFail(OnFailStrategy.STOP_FLOW)
                .build();

        FlowStep step2 = FlowStep.builder()
                .id(UUID.randomUUID())
                .flowId(flowId)
                .stepKind(StepKind.OPERATION_STEP)
                .binding(Binding.LINKED)
                .operationId(operationId2)
                .stepOrder(1)
                .onFail(OnFailStrategy.SKIP_AND_CONTINUE)
                .build();

        HttpOperationConfig config1 = new HttpOperationConfig();
        config1.setMethod("GET");
        config1.setUrl("https://api.example.com/users");

        HttpOperationConfig config2 = new HttpOperationConfig();
        config2.setMethod("POST");
        config2.setUrl("https://api.example.com/orders");

        Operation operation1 = Operation.builder()
                .id(operationId1)
                .name("Get Users")
                .type(OperationType.HTTP_REQUEST)
                .configTemplate(config1)
                .build();

        Operation operation2 = Operation.builder()
                .id(operationId2)
                .name("Create Order")
                .type(OperationType.HTTP_REQUEST)
                .configTemplate(config2)
                .build();

        when(flowStepService.getAllSteps(flowId)).thenReturn(List.of(step1, step2));
        when(operationService.findById(operationId1)).thenReturn(operation1);
        when(operationService.findById(operationId2)).thenReturn(operation2);
        when(extractionRuleService.getRulesByStepIds(any())).thenReturn(Map.of());

        // ── when ───────────────────────────────────────────────────────────────
        List<CompiledStep> result = compiler.compile(flow);

        // ── then ───────────────────────────────────────────────────────────────
        assertThat(result).hasSize(2);

        assertThat(result.getFirst().stepIndex()).isEqualTo(0);
        assertThat(result.getFirst().operationName()).isEqualTo("Get Users");
        assertThat(result.getFirst().operationType()).isEqualTo(OperationType.HTTP_REQUEST);
        assertThat(result.get(0).onFail()).isEqualTo(OnFailStrategy.STOP_FLOW);
        assertThat(result.get(0).extractionRules()).isEmpty();

        assertThat(result.get(1).stepIndex()).isEqualTo(1);
        assertThat(result.get(1).operationName()).isEqualTo("Create Order");
        assertThat(result.get(1).onFail()).isEqualTo(OnFailStrategy.SKIP_AND_CONTINUE);
    }

    @Test
    @DisplayName("compile() — вложенный Flow разворачивается в плоский список")
    void compile_nestedFlowInsideFlow_returnsCorrectCompiledList() {
        // ── given ──────────────────────────────────────────────────────────────
        UUID rootFlowId = UUID.randomUUID();
        Flow rootFlow = Flow.builder()
                .id(rootFlowId)
                .name("Root Flow")
                .build();

        UUID nestedFlowId = UUID.randomUUID();
        Flow nestedFlow = Flow.builder()
                .id(nestedFlowId)
                .name("Nested Flow")
                .build();

        UUID operationId1 = UUID.randomUUID();
        UUID operationId2 = UUID.randomUUID();

        FlowStep nestedFlowStep1 = FlowStep.builder()
                .id(UUID.randomUUID())
                .flowId(nestedFlowId)
                .stepKind(StepKind.OPERATION_STEP)
                .binding(Binding.LINKED)
                .operationId(operationId1)
                .stepOrder(0)
                .onFail(OnFailStrategy.STOP_FLOW)
                .build();

        FlowStep nestedFlowStep2 = FlowStep.builder()
                .id(UUID.randomUUID())
                .flowId(nestedFlowId)
                .stepKind(StepKind.OPERATION_STEP)
                .binding(Binding.LINKED)
                .operationId(operationId2)
                .stepOrder(1)
                .onFail(OnFailStrategy.SKIP_AND_CONTINUE)
                .build();

        HttpOperationConfig config1 = new HttpOperationConfig();
        config1.setMethod("GET");
        config1.setUrl("https://api.example.com/users");

        HttpOperationConfig config2 = new HttpOperationConfig();
        config2.setMethod("POST");
        config2.setUrl("https://api.example.com/orders");

        Operation operation1 = Operation.builder()
                .id(operationId1)
                .name("Get Users")
                .type(OperationType.HTTP_REQUEST)
                .configTemplate(config1)
                .build();

        Operation operation2 = Operation.builder()
                .id(operationId2)
                .name("Create Order")
                .type(OperationType.HTTP_REQUEST)
                .configTemplate(config2)
                .build();

        FlowStep rootFlowStep = FlowStep.builder()
                .id(UUID.randomUUID())
                .flowId(rootFlowId)
                .stepKind(StepKind.FLOW_STEP)
                .nestedFlowId(nestedFlowId)
                .stepOrder(0)
                .onFail(OnFailStrategy.STOP_FLOW)
                .build();

        when(flowService.findById(nestedFlowId)).thenReturn(nestedFlow);
        when(flowStepService.getAllSteps(rootFlowId)).thenReturn(List.of(rootFlowStep));
        when(flowStepService.getAllSteps(nestedFlowId)).thenReturn(List.of(nestedFlowStep1, nestedFlowStep2));
        when(operationService.findById(operationId1)).thenReturn(operation1);
        when(operationService.findById(operationId2)).thenReturn(operation2);
        when(extractionRuleService.getRulesByStepIds(any())).thenReturn(Map.of());

        // ── when ───────────────────────────────────────────────────────────────
        List<CompiledStep> result = compiler.compile(rootFlow);

        // ── then ───────────────────────────────────────────────────────────────
        assertThat(result).hasSize(2);

        assertThat(result.getFirst().stepIndex()).isEqualTo(0);
        assertThat(result.getFirst().operationName()).isEqualTo("Get Users");
        assertThat(result.getFirst().operationType()).isEqualTo(OperationType.HTTP_REQUEST);
        assertThat(result.get(0).onFail()).isEqualTo(OnFailStrategy.STOP_FLOW);
        assertThat(result.get(0).extractionRules()).isEmpty();

        assertThat(result.get(1).stepIndex()).isEqualTo(1);
        assertThat(result.get(1).operationName()).isEqualTo("Create Order");
        assertThat(result.get(1).onFail()).isEqualTo(OnFailStrategy.SKIP_AND_CONTINUE);
    }

    @Test
    @DisplayName("compile() — превышение maxNestingDepth бросает FlowCompilationException")
    void compile_exceedsMaxNestingDepth_throwsFlowCompilationException() {
        // ── given ──────────────────────────────────────────────────────────────
        // depth limit = 1, но цепочка: root → nested → deep (глубина 2)
        ReflectionTestUtils.setField(compiler, "maxNestingDepth", 1);

        UUID rootFlowId = UUID.randomUUID();
        Flow rootFlow = Flow.builder().id(rootFlowId).name("Root Flow").build();

        UUID nestedFlowId = UUID.randomUUID();
        Flow nestedFlow = Flow.builder().id(nestedFlowId).name("Nested Flow").build();

        UUID deepFlowId = UUID.randomUUID();
        Flow deepFlow = Flow.builder().id(deepFlowId).name("Deep Flow").build();

        FlowStep rootStep = FlowStep.builder()
                .id(UUID.randomUUID())
                .flowId(rootFlowId)
                .stepKind(StepKind.FLOW_STEP)
                .nestedFlowId(nestedFlowId)
                .stepOrder(0)
                .onFail(OnFailStrategy.STOP_FLOW)
                .build();

        FlowStep nestedStep = FlowStep.builder()
                .id(UUID.randomUUID())
                .flowId(nestedFlowId)
                .stepKind(StepKind.FLOW_STEP)
                .nestedFlowId(deepFlowId)
                .stepOrder(0)
                .onFail(OnFailStrategy.STOP_FLOW)
                .build();

        when(flowStepService.getAllSteps(rootFlowId)).thenReturn(List.of(rootStep));
        when(flowService.findById(nestedFlowId)).thenReturn(nestedFlow);
        when(flowStepService.getAllSteps(nestedFlowId)).thenReturn(List.of(nestedStep));
        when(flowService.findById(deepFlowId)).thenReturn(deepFlow);

        // ── when / then ────────────────────────────────────────────────────────
        assertThatThrownBy(() -> compiler.compile(rootFlow))
                .isInstanceOf(FlowCompilationException.class)
                .hasMessageContaining("Maximum nesting depth");
    }
}
