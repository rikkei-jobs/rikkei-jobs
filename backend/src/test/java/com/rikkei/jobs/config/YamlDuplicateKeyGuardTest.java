package com.rikkei.jobs.config;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assertions.fail;

import java.io.IOException;
import java.io.Reader;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Comparator;
import java.util.List;
import java.util.stream.Stream;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.yaml.snakeyaml.LoaderOptions;
import org.yaml.snakeyaml.Yaml;
import org.yaml.snakeyaml.constructor.DuplicateKeyException;

@DisplayName("YAML Duplicate-Key Guard Tests")
class YamlDuplicateKeyGuardTest {

    @Test
    @DisplayName("Every application*.yml under src/main/resources has no duplicate keys")
    void applicationYamlFilesContainNoDuplicateKeys() throws IOException {
        Path resourcesRoot = Path.of("src", "main", "resources");
        assertTrue(
                Files.isDirectory(resourcesRoot),
                "Expected src/main/resources directory under backend working directory");

        List<Path> yamlFiles;
        try (Stream<Path> walk = Files.walk(resourcesRoot)) {
            yamlFiles =
                    walk.filter(Files::isRegularFile)
                            .filter(
                                    path -> {
                                        Path fileNamePath = path.getFileName();
                                        if (fileNamePath == null) {
                                            return false;
                                        }
                                        String name = fileNamePath.toString();
                                        return name.startsWith("application")
                                                && (name.endsWith(".yml")
                                                        || name.endsWith(".yaml"));
                                    })
                            .sorted(Comparator.comparing(Path::toString))
                            .toList();
        }

        assertFalse(yamlFiles.isEmpty(), "Expected at least one application*.yml file");
        List<String> fileNames =
                yamlFiles.stream().map(p -> String.valueOf(p.getFileName())).toList();
        assertTrue(fileNames.contains("application.yml"), "Expected application.yml");
        assertTrue(fileNames.contains("application-dev.yml"), "Expected application-dev.yml");
        assertTrue(fileNames.contains("application-prod.yml"), "Expected application-prod.yml");

        for (Path yamlFile : yamlFiles) {
            assertNoDuplicateKeys(yamlFile);
        }
    }

    @Test
    @DisplayName("docker-compose.yml has no duplicate keys when present")
    void dockerComposeContainsNoDuplicateKeys() throws IOException {
        Path dockerCompose = Path.of("..", "docker-compose.yml");
        if (Files.isRegularFile(dockerCompose)) {
            assertNoDuplicateKeys(dockerCompose);
        }
    }

    @Test
    @DisplayName("Guard rejects both top-level and nested duplicate YAML keys")
    void guardDetectsTopLevelAndNestedDuplicateKeys() {
        Yaml strictYaml = createStrictYaml();
        String topLevelDuplicate =
                """
                app:
                  frontend-url: http://localhost:3000
                app:
                  ai:
                    config-cache-ttl-ms: 5000
                """;
        assertThrows(
                DuplicateKeyException.class,
                () -> consumeAllDocuments(strictYaml, topLevelDuplicate));

        String nestedDuplicate =
                """
                app:
                  mail:
                    from: a@example.com
                  mail:
                    from: b@example.com
                """;
        assertThrows(
                DuplicateKeyException.class,
                () -> consumeAllDocuments(strictYaml, nestedDuplicate));
    }

    private static void assertNoDuplicateKeys(Path yamlPath) throws IOException {
        Yaml strictYaml = createStrictYaml();
        try (Reader reader = Files.newBufferedReader(yamlPath, StandardCharsets.UTF_8)) {
            for (Object doc : strictYaml.loadAll(reader)) {
                assertTrue(doc == null || doc instanceof Object);
            }
        } catch (DuplicateKeyException ex) {
            fail("Duplicate YAML key detected in " + yamlPath + ": " + ex.getMessage(), ex);
        }
    }

    private static void consumeAllDocuments(Yaml yaml, String content) {
        for (Object doc : yaml.loadAll(content)) {
            assertTrue(doc == null || doc instanceof Object);
        }
    }

    private static Yaml createStrictYaml() {
        LoaderOptions options = new LoaderOptions();
        options.setAllowDuplicateKeys(false);
        return new Yaml(options);
    }
}
