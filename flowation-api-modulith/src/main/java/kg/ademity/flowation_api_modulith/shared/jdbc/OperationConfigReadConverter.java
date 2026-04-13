package kg.ademity.flowation_api_modulith.shared.jdbc;

import com.fasterxml.jackson.databind.ObjectMapper;
import kg.ademity.flowation_api_modulith.catalog.config.OperationConfig;
import lombok.RequiredArgsConstructor;
import lombok.SneakyThrows;
import org.postgresql.util.PGobject;
import org.springframework.core.convert.converter.Converter;
import org.springframework.data.convert.ReadingConverter;

@ReadingConverter
@RequiredArgsConstructor
public class OperationConfigReadConverter implements Converter<PGobject, OperationConfig> {

    private final ObjectMapper objectMapper;

    @SneakyThrows
    @Override
    public OperationConfig convert(PGobject source) {
        return objectMapper.readValue(source.getValue(), OperationConfig.class);
    }
}
