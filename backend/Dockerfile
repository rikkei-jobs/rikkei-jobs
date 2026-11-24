# Multi-stage Dockerfile for Rikkei Jobs Backend (Java 25 LTS + Spring Boot 4.1.2)

# Stage 1: Build stage
FROM eclipse-temurin:25.0.5_8-jdk-alpine-3.21 AS builder
WORKDIR /workspace

# Copy Maven wrapper and POM
COPY .mvn/ .mvn/
COPY mvnw pom.xml ./
RUN chmod +x mvnw && ./mvnw dependency:go-offline -B

# Copy source code and build, then extract Spring Boot layers for fast classpath loading
COPY src/ src/
RUN ./mvnw clean package -DskipTests -B \
    && mkdir -p /workspace/extracted \
    && java -Djarmode=tools -jar target/*.jar extract --destination /workspace/extracted --application-filename app.jar

# Stage 2: Runtime stage
FROM eclipse-temurin:25.0.5_8-jre-alpine-3.21 AS runner
WORKDIR /app

# Create non-root user and group for security and own empty /app before copying layers
RUN addgroup -S appgroup && adduser -S appuser -G appgroup && chown appuser:appgroup /app

# Copy extracted application and dependencies from builder with target ownership
COPY --from=builder --chown=appuser:appgroup /workspace/extracted/ /app/

# hadolint ignore=DL3066
USER appuser:appgroup

# Generate AppCDS archive directly as appuser without duplicating JAR layers
RUN JWT_SECRET="$(cat /proc/sys/kernel/random/uuid)" java -XX:+UseZGC -Xms256m -Xmx512m \
    -Xlog:cds=off \
    -XX:ArchiveClassesAtExit=/app/app.jsa \
    -Dspring.context.exit=onRefresh \
    -Dspring.flyway.enabled=false \
    -Dspring.datasource.hikari.initialization-fail-timeout=-1 \
    -Dspring.jpa.properties.hibernate.boot.allow_jdbc_metadata_access=false \
    -Dspring.jpa.database-platform=org.hibernate.dialect.PostgreSQLDialect \
    -Dspring.datasource.url=jdbc:postgresql://127.0.0.1:1/unused \
    -jar /app/app.jar

# Expose default HTTP port
EXPOSE 8080

# Environment variables with safe defaults
ENV SERVER_PORT=8080 \
    JAVA_OPTS="-XX:+UseZGC -Xms256m -Xmx512m"

ENTRYPOINT ["sh", "-c", "exec java -Xlog:cds=off $JAVA_OPTS -XX:SharedArchiveFile=/app/app.jsa -jar /app/app.jar"]
