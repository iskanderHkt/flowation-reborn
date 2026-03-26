package kg.ademity.flowation_api_modulith.execution_module.executor;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import kg.ademity.flowation_api_modulith.flow_module.operation.OperationType;
import kg.ademity.flowation_api_modulith.flow_module.operation.config.HttpOperationConfig;
import kg.ademity.flowation_api_modulith.flow_module.operation.config.OperationConfig;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.HashMap;
import java.util.Map;

@Component
@RequiredArgsConstructor
public class HttpOperationExecutor implements OperationExecutor {

    private final HttpClient httpClient = HttpClient.newHttpClient();
    private final ObjectMapper objectMapper;

    @Override
    public boolean supports(OperationType type) {
        return type == OperationType.HTTP_REQUEST;
    }

    @Override
    public StepResult execute(OperationConfig config, Map<String, Object> context) {
        HttpOperationConfig http = (HttpOperationConfig) config;

        String url = VariableResolver.resolve(http.getUrl(), context);
        String body = VariableResolver.resolve(http.getBody(), context);
        int timeoutMs = http.getTimeoutMs() != null ? http.getTimeoutMs() : 5000;

        Map<String, Object> requestSnapshot = new HashMap<>();
        requestSnapshot.put("method", http.getMethod());
        requestSnapshot.put("url", url);
        requestSnapshot.put("headers", http.getHeaders());
        requestSnapshot.put("body", body);

        long start = System.currentTimeMillis();
        try {
            HttpRequest.Builder builder = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .timeout(Duration.ofMillis(timeoutMs));

            if (http.getHeaders() != null) {
                http.getHeaders().forEach(builder::header);
            }

            HttpRequest.BodyPublisher bodyPublisher = (body != null && !body.isBlank())
                    ? HttpRequest.BodyPublishers.ofString(body)
                    : HttpRequest.BodyPublishers.noBody();

            builder.method(http.getMethod(), bodyPublisher);

            HttpResponse<String> response = httpClient.send(builder.build(), HttpResponse.BodyHandlers.ofString());
            int durationMs = (int) (System.currentTimeMillis() - start);

            Map<String, Object> responseSnapshot = new HashMap<>();
            responseSnapshot.put("status", response.statusCode());
            responseSnapshot.put("headers", response.headers().map());

            try {
                Object parsedBody = objectMapper.readValue(response.body(), Object.class);
                responseSnapshot.put("body", parsedBody);
            } catch (Exception e) {
                responseSnapshot.put("body", response.body());
            }

            return StepResult.success(requestSnapshot, responseSnapshot, durationMs);
        } catch (Exception e) {
            int durationMs = (int) (System.currentTimeMillis() - start);
            return StepResult.failure(requestSnapshot, e.getMessage(), durationMs);
        }
    }
}
