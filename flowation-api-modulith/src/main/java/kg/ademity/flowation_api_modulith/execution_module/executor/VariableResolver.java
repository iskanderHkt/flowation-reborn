package kg.ademity.flowation_api_modulith.execution_module.executor;

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
            Object value = context.getOrDefault(varName, matcher.group(0));
            matcher.appendReplacement(result, Matcher.quoteReplacement(value.toString()));
        }
        matcher.appendTail(result);
        return result.toString();
    }
}
