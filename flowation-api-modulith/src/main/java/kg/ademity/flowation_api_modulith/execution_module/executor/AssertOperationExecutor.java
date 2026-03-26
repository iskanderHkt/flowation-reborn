package kg.ademity.flowation_api_modulith.execution_module.executor;

import kg.ademity.flowation_api_modulith.flow_module.operation.OperationType;
import kg.ademity.flowation_api_modulith.flow_module.operation.config.AssertOperationConfig;
import kg.ademity.flowation_api_modulith.flow_module.operation.config.OperationConfig;
import org.springframework.stereotype.Component;

import java.util.Map;

@Component
public class AssertOperationExecutor implements OperationExecutor {

    @Override
    public boolean supports(OperationType type) {
        return type == OperationType.ASSERTION;
    }

    @Override
    public StepResult execute(OperationConfig config, Map<String, Object> context) {
        AssertOperationConfig assert_ = (AssertOperationConfig) config;

        String actual = VariableResolver.resolve(assert_.getExpression(), context);
        String expected = assert_.getExpected();
        String comparator = assert_.getComparator();

        Map<String, Object> requestSnapshot = Map.of(
                "expression", assert_.getExpression(),
                "comparator", comparator,
                "expected", expected != null ? expected : ""
        );

        long start = System.currentTimeMillis();
        try {
            boolean passed = evaluate(actual, comparator, expected);
            int durationMs = (int) (System.currentTimeMillis() - start);

            Map<String, Object> responseSnapshot = Map.of(
                    "actual", actual != null ? actual : "",
                    "passed", passed
            );

            if (passed) {
                return StepResult.success(requestSnapshot, responseSnapshot, durationMs);
            } else {
                String message = "Assertion failed: [%s] %s [%s]".formatted(actual, comparator, expected);
                return StepResult.failure(requestSnapshot, responseSnapshot, message, durationMs);
            }
        } catch (Exception e) {
            int durationMs = (int) (System.currentTimeMillis() - start);
            return StepResult.failure(requestSnapshot, e.getMessage(), durationMs);
        }
    }

    private boolean evaluate(String actual, String comparator, String expected) {
        return switch (comparator) {
            case "EQ"       -> actual != null && actual.equals(expected);
            case "NEQ"      -> actual == null || !actual.equals(expected);
            case "CONTAINS" -> actual != null && actual.contains(expected);
            case "REGEX"    -> actual != null && actual.matches(expected);
            case "GT"       -> Double.parseDouble(actual) > Double.parseDouble(expected);
            case "LT"       -> Double.parseDouble(actual) < Double.parseDouble(expected);
            case "IS_NULL"  -> actual == null || actual.isBlank();
            default         -> throw new IllegalArgumentException("Unknown comparator: " + comparator);
        };
    }
}
