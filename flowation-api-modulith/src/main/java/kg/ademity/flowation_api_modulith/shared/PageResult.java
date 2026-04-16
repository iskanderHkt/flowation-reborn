package kg.ademity.flowation_api_modulith.shared;

import java.util.List;

public record PageResult<T>(
        List<T> content,
        long total,
        int page,
        int size
) {}
