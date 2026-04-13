package kg.ademity.flowation_api_modulith.execution.executor;

import kg.ademity.flowation_api_modulith.catalog.OperationType;
import kg.ademity.flowation_api_modulith.catalog.config.OperationConfig;
import kg.ademity.flowation_api_modulith.catalog.config.SqlOperationConfig;
import org.springframework.stereotype.Component;

import java.sql.*;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Component
public class SqlOperationExecutor implements OperationExecutor<SqlOperationConfig> {

    @Override
    public boolean supports(OperationType type) {
        return type == OperationType.SQL_QUERY;
    }

    @Override
    public StepResult execute(SqlOperationConfig sql, Map<String, Object> context) {

        String connectionString = VariableResolver.resolve(sql.getConnectionString(), context);
        String query = VariableResolver.resolve(sql.getQuery(), context);

        Map<String, Object> requestSnapshot = new HashMap<>();
        requestSnapshot.put("dbType", sql.getDbType());
        requestSnapshot.put("query", query);

        long start = System.currentTimeMillis();
        try (Connection connection = DriverManager.getConnection(connectionString);
             Statement statement = connection.createStatement()) {

            boolean isSelect = statement.execute(query);
            int durationMs = (int) (System.currentTimeMillis() - start);

            Map<String, Object> responseSnapshot = new HashMap<>();
            if (isSelect) {
                List<Map<String, Object>> rows = new ArrayList<>();
                try (ResultSet rs = statement.getResultSet()) {
                    ResultSetMetaData meta = rs.getMetaData();
                    int columnCount = meta.getColumnCount();
                    while (rs.next()) {
                        Map<String, Object> row = new HashMap<>();
                        for (int i = 1; i <= columnCount; i++) {
                            row.put(meta.getColumnName(i), rs.getObject(i));
                        }
                        rows.add(row);
                    }
                }
                responseSnapshot.put("rows", rows);
                responseSnapshot.put("rowCount", rows.size());
            } else {
                responseSnapshot.put("affectedRows", statement.getUpdateCount());
            }

            return StepResult.success(requestSnapshot, responseSnapshot, durationMs);
        } catch (Exception e) {
            int durationMs = (int) (System.currentTimeMillis() - start);
            return StepResult.failure(requestSnapshot, e.getMessage(), durationMs);
        }
    }
}
