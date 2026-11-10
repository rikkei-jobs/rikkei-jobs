# Stage 1: Build SPA static files
FROM node:24.22.2-alpine3.23 AS builder

WORKDIR /app

# Copy dependency manifests first for build caching
COPY package.json package-lock.json* ./
RUN npm ci

# Copy project source and compile bundle
COPY . .
RUN npm run build

# Stage 2: Production Nginx container
FROM nginx:1.30.6-alpine3.24

# Clean default nginx files
RUN rm -rf /etc/nginx/conf.d/* /usr/share/nginx/html/*

# Copy built SPA assets from builder
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy unprivileged Nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Setup required directories and non-root permissions for user nginx (UID 101)
RUN mkdir -p /tmp/client_temp /tmp/proxy_temp /tmp/fastcgi_temp /tmp/uwsgi_temp /tmp/scgi_temp \
    && chown -R nginx:nginx /usr/share/nginx/html /etc/nginx /var/log/nginx /tmp/*_temp \
    && chmod -R 755 /usr/share/nginx/html /var/log/nginx

# Switch to non-root user
# hadolint ignore=DL3066
USER nginx

# Production container listens on port 8080
EXPOSE 8080

# hadolint ignore=DL3025
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://127.0.0.1:8080/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
