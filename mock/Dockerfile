# ==============================================================================
# Dockerfile for Rikkei Jobs External Systems Mock Service
# Platform: Node.js 24 LTS on Alpine Linux (Non-root user)
# ==============================================================================

FROM node:24.22.2-alpine3.23

# Set working directory
WORKDIR /app


# Set production environment
ENV NODE_ENV=production \
    PORT=9000 \
    SERVICE_KEY=dev-key

# Install dependencies first for better caching
COPY package.json package-lock.json ./

RUN npm ci --omit=dev

# Copy application source code
COPY server.js data.json send-evaluation-links.js ./

# Assign file ownership to the non-root node user
RUN chown -R node:node /app

# Switch to non-root user
# hadolint ignore=DL3066
USER node

# Expose HTTP port
EXPOSE 9000

# Health check to ensure service readiness
# hadolint ignore=DL3025
HEALTHCHECK --interval=10s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:9000/mock/requests || exit 1

# Start mock server
CMD ["node", "server.js"]
