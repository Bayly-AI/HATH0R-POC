# Multi-stage Dockerfile for HATH0R-POC UI testbed & integration console
# Stage 1: Build client and server
FROM node:20-alpine AS builder

WORKDIR /app

# Install build dependencies
COPY package.json package-lock.json ./
RUN npm ci

# Copy source code and build config
COPY . .

# Run type checking and production builds
RUN npm run typecheck
RUN npx vite build
RUN npx tsc -p tsconfig.server.json

# Stage 2: Production unprivileged NGINX static asset server with SPA fallback
FROM nginxinc/nginx-unprivileged:1.27-alpine AS production

LABEL maintainer="Bayly AI <ops@baylyai.com>"
LABEL org.opencontainers.image.title="hath0r-poc"
LABEL org.opencontainers.image.description="HATH0R Integration Console POC UI"
LABEL org.opencontainers.image.vendor="Bayly-AI"

# Custom NGINX config for SPA routing and healthcheck
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy Vite build artifacts from builder stage
COPY --from=builder /app/dist/client /usr/share/nginx/html

# Expose HTTP port
EXPOSE 8080

# Healthcheck endpoint
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://127.0.0.1:8080/healthz || exit 1

CMD ["nginx", "-g", "daemon off;"]
