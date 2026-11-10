# ==============================================================================
# Dockerfile for Rikkei Jobs External Systems Mock Service
# Platform: Node.js 24 LTS on Alpine Linux (Non-root user)
# ==============================================================================

FROM node:24-alpine

# Set working directory
WORKDIR /app

# Set production environment
ENV NODE_ENV=production \
    PORT=9000 \
    SERVICE_KEY=dev-key

# Install dependencies first for better caching
COPY package.json package-lock.json* ./

RUN npm ci --omit=dev || npm install --omit=dev

# Copy application source code
COPY server.js data.json send-evaluation-links.js ./

# Assign file ownership to the non-root node user
RUN chown -R node:node /app

# Switch to non-root user
USER node

# Expose HTTP port
EXPOSE 9000

# Health check to ensure service readiness
HEALTHCHECK --interval=10s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:9000/mock/requests || exit 1

# Start mock server
CMD ["node", "server.js"]
