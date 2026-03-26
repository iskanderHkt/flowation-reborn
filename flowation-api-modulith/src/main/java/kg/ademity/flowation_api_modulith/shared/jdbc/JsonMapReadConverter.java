package kg.ademity.flowation_api_modulith.shared.jdbc;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.SneakyThrows;
import org.postgresql.util.PGobject;
import org.springframework.core.convert.converter.Converter;
import org.springframework.data.convert.ReadingConverter;

import java.util.Map;

@ReadingConverter
@RequiredArgsConstructor
public class JsonMapReadConverter implements Converter<PGobject, Map<String, Object>> {

    private final ObjectMapper objectMapper;

    @SneakyThrows
    @Override
    public Map<String, Object> convert(PGobject source) {
        return objectMapper.readValue(source.getValue(), new TypeReference<>() {});
    }
}
