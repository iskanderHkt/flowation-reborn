package kg.ademity.flowation_api_modulith.batch;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

@Configuration
public class BatchExecutorConfig {

    /**
     * Bounded virtual-thread executor for batch flow execution.
     * Limits concurrent flow runs to avoid overwhelming downstream services.
     */
    @Bean(name = "batchExecutor")
    public ExecutorService batchExecutor() {
        return Executors.newVirtualThreadPerTaskExecutor();
    }
}
