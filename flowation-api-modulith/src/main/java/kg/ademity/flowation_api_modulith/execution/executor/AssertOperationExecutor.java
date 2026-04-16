package kg.ademity.flowation_api_modulith.execution.executor;

import kg.ademity.flowation_api_modulith.execution.AbsentValue;
import kg.ademity.flowation_api_modulith.catalog.OperationType;
import kg.ademity.flowation_api_modulith.catalog.config.AssertOperationConfig;
import kg.ademity.flowation_api_modulith.catalog.config.OperationConfig;
import org.springframework.stereotype.Component;

import java.util.HashMap;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Component
public class AssertOperationExecutor implements OperationExecutor<AssertOperationConfig> {

    private static final Pattern VAR_PATTERN = Pattern.compile("^\\{\\{(\\w+)\\}\\}$");

    private record UnaryResult(boolean passed, String actualDisplay) {}

    @Override
    public boolean supports(OperationType type) {
        return type == OperationType.ASSERTION;
    }

    @Override
    public StepResult execute(AssertOperationConfig assert_, Map<String, Object> context) {

        String comparator = assert_.getComparator();
        String expected = assert_.getExpected();

        Map<String, Object> requestSnapshot = new HashMap<>();
        requestSnapshot.put("expression", assert_.getExpression() != null ? assert_.getExpression() : "");
        requestSnapshot.put("comparator", comparator);
        if (!isUnary(comparator)) {
            requestSnapshot.put("expected", expected != null ? expected : "");
        }

        long start = System.currentTimeMillis();
        try {
            if (isUnary(comparator)) {
                UnaryResult result = evaluateUnary(comparator, assert_.getExpression(), context);
                int durationMs = (int) (System.currentTimeMillis() - start);
                Map<String, Object> responseSnapshot = Map.of("actual", result.actualDisplay(), "passed", result.passed());
                if (result.passed()) {
                    return StepResult.success(requestSnapshot, responseSnapshot, durationMs);
                } else {
                    String message = "IS_NULL".equals(comparator)
                            ? "Assertion failed: expression is not null/absent"
                            : "Assertion failed: expression is null/absent";
                    return StepResult.failure(requestSnapshot, responseSnapshot, message, durationMs);
                }
            }

            String actual = VariableResolver.resolve(assert_.getExpression(), context);
            String resolvedExpected = expected != null ? VariableResolver.resolve(expected, context) : null;
            boolean passed = evaluate(actual, comparator, resolvedExpected);
            int durationMs = (int) (System.currentTimeMillis() - start);

            Map<String, Object> responseSnapshot = Map.of(
                    "actual", actual != null ? actual : "",
                    "passed", passed
            );

            if (passed) {
                return StepResult.success(requestSnapshot, responseSnapshot, durationMs);
            } else {
                String message = "Assertion failed: [%s] %s [%s]".formatted(actual, comparator, resolvedExpected);
                return StepResult.failure(requestSnapshot, responseSnapshot, message, durationMs);
            }
        } catch (Exception e) {
            int durationMs = (int) (System.currentTimeMillis() - start);
            return StepResult.failure(requestSnapshot, e.getMessage(), durationMs);
        }
    }

    private boolean isUnary(String comparator) {
        return "IS_NULL".equals(comparator) || "IS_NOT_NULL".equals(comparator);
    }

    private UnaryResult evaluateUnary(String comparator, String expression, Map<String, Object> context) {
        boolean isAbsent;
        String actualDisplay;

        if (expression == null) {
            isAbsent = true;
            actualDisplay = "absent";
        } else {
            Matcher m = VAR_PATTERN.matcher(expression);
            if (m.matches()) {
                String varName = m.group(1);
                Object raw = context.get(varName);
                isAbsent = raw instanceof AbsentValue;
                actualDisplay = isAbsent ? "absent" : String.valueOf(raw);
            } else {
                isAbsent = expression.isBlank();
                actualDisplay = isAbsent ? "absent" : expression;
            }
        }

        boolean passed = "IS_NULL".equals(comparator) ? isAbsent : !isAbsent;
        return new UnaryResult(passed, actualDisplay);
    }

    private boolean evaluate(String actual, String comparator, String expected) {
        return switch (comparator) {
            case "EQ"       -> actual != null && actual.equals(expected);
            case "NEQ"      -> actual == null || !actual.equals(expected);
            case "CONTAINS" -> actual != null && actual.contains(expected);
            case "REGEX"    -> actual != null && actual.matches(expected);
            case "GT"       -> parseDouble(actual) > parseDouble(expected);
            case "LT"       -> parseDouble(actual) < parseDouble(expected);
            default         -> throw new IllegalArgumentException("Unknown comparator: " + comparator);
        };
    }

    private double parseDouble(String value) {
        if (value == null) {
            throw new IllegalArgumentException("Cannot compare null as a number");
        }
        try {
            return Double.parseDouble(value);
        } catch (NumberFormatException e) {
            throw new IllegalArgumentException("Cannot compare non-numeric value: '" + value + "'");
        }
    }
}
