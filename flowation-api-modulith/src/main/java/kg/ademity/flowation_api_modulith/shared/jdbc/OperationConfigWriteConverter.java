package kg.ademity.flowation_api_modulith.shared.jdbc;

import com.fasterxml.jackson.databind.ObjectMapper;
import kg.ademity.flowation_api_modulith.catalog.config.OperationConfig;
import lombok.RequiredArgsConstructor;
import lombok.SneakyThrows;
import org.postgresql.util.PGobject;
import org.springframework.core.convert.converter.Converter;
import org.springframework.data.convert.WritingConverter;

@WritingConverter
@RequiredArgsConstructor
public class OperationConfigWriteConverter implements Converter<OperationConfig, PGobject> {

    private final ObjectMapper objectMapper;

    @SneakyThrows
    @Override
    public PGobject convert(OperationConfig source) {
        PGobject json = new PGobject();
        json.setType("jsonb");
        json.setValue(objectMapper.writeValueAsString(source));
        return json;
    }
}
