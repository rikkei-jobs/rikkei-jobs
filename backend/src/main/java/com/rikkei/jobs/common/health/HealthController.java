package com.rikkei.jobs.common.health;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.Statement;
import java.util.Map;
import javax.sql.DataSource;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Health Check Controller for Backend and Database connectivity. Returns {"status":"UP"} when DB is
 * connected and Flyway migrations applied. Returns {"status":"DOWN"} when DB is unreachable or
 * unmigrated.
 */
@Tag(name = "Health Check", description = "Kiểm tra trạng thái hoạt động của hệ thống")
@RestController
@RequestMapping("/api/v1")
public class HealthController {

    private static final Logger log = LoggerFactory.getLogger(HealthController.class);

    private final DataSource dataSource;

    public HealthController(DataSource dataSource) {
        this.dataSource = dataSource;
    }

    @Operation(summary = "Kiểm tra sức khỏe hệ thống và cơ sở dữ liệu")
    @GetMapping("/health")
    public ResponseEntity<Map<String, String>> checkHealth() {
        boolean healthy = isDatabaseHealthyAndMigrated();
        if (healthy) {
            return ResponseEntity.ok(Map.of("status", "UP"));
        } else {
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                    .body(Map.of("status", "DOWN"));
        }
    }

    private boolean isDatabaseHealthyAndMigrated() {
        if (dataSource == null) {
            log.warn("Health check failed: DataSource is null");
            return false;
        }

        try (Connection connection = dataSource.getConnection()) {
            if (!connection.isValid(2)) {
                log.warn("Health check failed: Connection is not valid");
                return false;
            }

            // Verify Flyway migration history exists and has at least one successful migration
            try (Statement statement = connection.createStatement();
                    ResultSet rs =
                            statement.executeQuery(
                                    "SELECT COUNT(*) FROM flyway_schema_history WHERE success = true")) {
                if (rs.next()) {
                    int count = rs.getInt(1);
                    if (count > 0) {
                        return true;
                    }
                    log.warn("Health check failed: flyway_schema_history has 0 successful records");
                    return false;
                }
            } catch (Exception ex) {
                log.warn(
                        "Health check failed: flyway_schema_history table does not exist or unreadable: {}",
                        ex.getMessage());
                return false;
            }
            return false;
        } catch (Exception ex) {
            log.warn("Health check failed: Database unreachable: {}", ex.getMessage());
            return false;
        }
    }
}
