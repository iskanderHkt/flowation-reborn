package kg.ademity.flowation_api_modulith.shared;

import kg.ademity.flowation_api_modulith.execution.exception.StepExecutionException;
import kg.ademity.flowation_api_modulith.flow.compiler.FlowCompilationException;
import kg.ademity.flowation_api_modulith.shared.exception.NotFoundException;
import kg.ademity.flowation_api_modulith.shared.exception.ValidationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.time.Instant;
import java.util.Map;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(NotFoundException.class)
    public ResponseEntity<Map<String, Object>> handleNotFound(NotFoundException ex) {
        return error(HttpStatus.NOT_FOUND, "NOT_FOUND", ex.getMessage());
    }

    @ExceptionHandler(ValidationException.class)
    public ResponseEntity<Map<String, Object>> handleValidation(ValidationException ex) {
        return error(HttpStatus.UNPROCESSABLE_ENTITY, "VALIDATION_ERROR", ex.getMessage());
    }

    @ExceptionHandler(FlowCompilationException.class)
    public ResponseEntity<Map<String, Object>> handleCompilation(FlowCompilationException ex) {
        return error(HttpStatus.UNPROCESSABLE_ENTITY, "COMPILATION_ERROR", ex.getMessage());
    }

    @ExceptionHandler(StepExecutionException.class)
    public ResponseEntity<Map<String, Object>> handleStepExecution(StepExecutionException ex) {
        return error(HttpStatus.INTERNAL_SERVER_ERROR, "EXECUTION_ERROR", ex.getMessage());
    }

    @ExceptionHandler(RuntimeException.class)
    public ResponseEntity<Map<String, Object>> handleRuntime(RuntimeException ex) {
        return error(HttpStatus.INTERNAL_SERVER_ERROR, "INTERNAL_ERROR", ex.getMessage());
    }

    private ResponseEntity<Map<String, Object>> error(HttpStatus status, String errorCode, String message) {
        return ResponseEntity.status(status).body(Map.of(
                "status", status.value(),
                "error", errorCode,
                "message", message != null ? message : "Unexpected error",
                "timestamp", Instant.now().toString()
        ));
    }
}
