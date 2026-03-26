package kg.ademity.flowation_api_modulith.shared.jdbc;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.SneakyThrows;
import org.postgresql.util.PGobject;
import org.springframework.core.convert.converter.Converter;
import org.springframework.data.convert.WritingConverter;

import java.util.Map;

@WritingConverter
@RequiredArgsConstructor
public class JsonMapWriteConverter implements Converter<Map<String, Object>, PGobject> {

    private final ObjectMapper objectMapper;

    @SneakyThrows
    @Override
    public PGobject convert(Map<String, Object> source) {
        PGobject json = new PGobject();
        json.setType("jsonb");
        json.setValue(objectMapper.writeValueAsString(source));
        return json;
    }
}
