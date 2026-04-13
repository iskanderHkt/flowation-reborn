package kg.ademity.flowation_api_modulith.execution.executor;

import kg.ademity.flowation_api_modulith.execution.AbsentValue;

import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

class VariableResolver {

    private static final Pattern PATTERN = Pattern.compile("\\{\\{(\\w+)\\}\\}");

    private VariableResolver() {}

    static String resolve(String template, Map<String, Object> context) {
        if (template == null) return null;
        Matcher matcher = PATTERN.matcher(template);
        StringBuilder result = new StringBuilder();
        while (matcher.find()) {
            String varName = matcher.group(1);
            if (!context.containsKey(varName)) {
                throw new IllegalStateException("Variable '{{" + varName + "}}' not found in context");
            }
            Object value = context.get(varName);
            if (value instanceof AbsentValue) {
                throw new IllegalStateException("Variable '{{" + varName + "}}' has no value");
            }
            matcher.appendReplacement(result, Matcher.quoteReplacement(value.toString()));
        }
        matcher.appendTail(result);
        return result.toString();
    }
}
