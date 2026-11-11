# ==============================================================================
# Dockerfile for Clean Isolated CI Runner Harness (Defect D8)
# Environment: Ubuntu 22.04 LTS
# Toolchain: Node.js 24 LTS, Eclipse Temurin Java 25 LTS, Docker CE CLI & Compose
# ==============================================================================

FROM ubuntu:22.04

ENV DEBIAN_FRONTEND=noninteractive \
    JAVA_HOME=/usr/lib/jvm/temurin-25-jdk-amd64 \
    PATH=/usr/lib/jvm/temurin-25-jdk-amd64/bin:/usr/local/bin:$PATH \
    LANG=C.UTF-8 \
    LC_ALL=C.UTF-8

# Install base utilities and dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    curl \
    gnupg \
    git \
    jq \
    rsync \
    wget \
    lsb-release \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# Install Docker CE CLI and Docker Compose Plugin
RUN install -m 0755 -d /etc/apt/keyrings \
    && curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc \
    && chmod a+r /etc/apt/keyrings/docker.asc \
    && echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | tee /etc/apt/sources.list.d/docker.list \
    && apt-get update \
    && apt-get install -y --no-install-recommends docker-ce-cli docker-compose-plugin \
    && rm -rf /var/lib/apt/lists/*

# Install Node.js 24 LTS from NodeSource
RUN curl -fsSL https://deb.nodesource.com/setup_24.x | bash - \
    && apt-get install -y --no-install-recommends nodejs \
    && rm -rf /var/lib/apt/lists/*

# Install Eclipse Temurin Java 25 LTS from Adoptium
RUN curl -fsSL https://packages.adoptium.net/artifactory/api/gpg/key/public | gpg --dearmor -o /etc/apt/keyrings/adoptium.gpg \
    && echo "deb [signed-by=/etc/apt/keyrings/adoptium.gpg] https://packages.adoptium.net/artifactory/deb jammy main" | tee /etc/apt/sources.list.d/adoptium.list \
    && apt-get update \
    && apt-get install -y --no-install-recommends temurin-25-jdk \
    && rm -rf /var/lib/apt/lists/*

# Pre-cache pinned CLI linters
RUN npm install -g markdownlint-cli2@0.24.0 cspell@10.4.1 @cspell/dict-vi-vn@3.0.7

WORKDIR /ci-workspace

COPY scripts/run-ci-in-docker.sh /usr/local/bin/run-ci-in-docker.sh
RUN chmod +x /usr/local/bin/run-ci-in-docker.sh

ENTRYPOINT ["/usr/local/bin/run-ci-in-docker.sh"]
