# Multi-stage Dockerfile for Rikkei Jobs Backend (Java 25 LTS + Spring Boot 4.1.2)

# Stage 1: Build stage
FROM eclipse-temurin:25-jdk-alpine AS builder
WORKDIR /workspace

# Copy Maven wrapper and POM
COPY .mvn/ .mvn/
COPY mvnw pom.xml ./
RUN chmod +x mvnw && ./mvnw dependency:go-offline -B

# Copy source code and build
COPY src/ src/
RUN ./mvnw clean package -DskipTests -B

# Stage 2: Runtime stage
FROM eclipse-temurin:25-jre-alpine AS runner
WORKDIR /app

# Create non-root user and group for security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Copy compiled JAR from builder
COPY --from=builder /workspace/target/*.jar app.jar

# Set permissions
RUN chown -R appuser:appgroup /app
USER appuser:appgroup

# Expose default HTTP port
EXPOSE 8080

# Environment variables with safe defaults
ENV SPRING_PROFILES_ACTIVE=prod \
    SERVER_PORT=8080 \
    JAVA_OPTS="-XX:+UseZGC -XX:+ZGenerational -Xms256m -Xmx512m"

ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar app.jar"]
