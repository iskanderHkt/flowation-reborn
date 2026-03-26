package kg.ademity.flowation_api_modulith.shared.jdbc;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.jdbc.core.convert.JdbcCustomConversions;

import java.util.List;

@Configuration
@RequiredArgsConstructor
public class JdbcConvertersConfig {

    private final ObjectMapper objectMapper;

    @Bean
    public JdbcCustomConversions jdbcCustomConversions() {
        return new JdbcCustomConversions(List.of(
                new OperationConfigReadConverter(objectMapper),
                new OperationConfigWriteConverter(objectMapper),
                new JsonMapReadConverter(objectMapper),
                new JsonMapWriteConverter(objectMapper)
        ));
    }
}
