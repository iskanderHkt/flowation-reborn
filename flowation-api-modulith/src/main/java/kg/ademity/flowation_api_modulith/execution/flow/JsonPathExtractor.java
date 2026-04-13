package kg.ademity.flowation_api_modulith.execution.flow;

import java.util.List;
import java.util.Map;

/**
 * Minimal JSONPath extractor for responseSnapshot maps.
 * Supports dot notation: $.body.token, $.rows[0].id, $.rowCount
 */
class JsonPathExtractor {

    private JsonPathExtractor() {}

    @SuppressWarnings("unchecked")
    static Object extract(Map<String, Object> root, String path) {
        if (root == null || path == null) return null;

        // strip leading "$."
        String normalized = path.startsWith("$.") ? path.substring(2) : path;
        String[] segments = normalized.split("\\.");

        Object current = root;

        for (String segment : segments) {
            if (current == null) return null;

            // handle array index: rows[0]
            int bracketStart = segment.indexOf('[');
            if (bracketStart != -1) {
                String key = segment.substring(0, bracketStart);
                String indexStr = segment.substring(bracketStart + 1, segment.indexOf(']'));
                int index = Integer.parseInt(indexStr);

                if (current instanceof Map<?, ?> map) {
                    Object value = map.get(key);
                    if (value instanceof List<?> list) {
                        current = index < list.size() ? list.get(index) : null;
                    } else {
                        return null;
                    }
                } else {
                    return null;
                }
            } else {
                if (current instanceof Map<?, ?> map) {
                    current = map.get(segment);
                } else {
                    return null;
                }
            }
        }

        return current;
    }
}
