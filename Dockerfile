# ============================================================
# UPLIFT CORE API - Production Dockerfile
# Multi-stage build for minimal image size
# ============================================================

# Stage 1: Dependencies
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev && npm cache clean --force

# Stage 2: Builder (for any build steps if needed)
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Add any build steps here if needed (e.g., TypeScript compilation)

# Stage 3: Production
FROM node:20-alpine AS runner
WORKDIR /app

# Install security updates
RUN apk update && apk upgrade && rm -rf /var/cache/apk/*

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S uplift -u 1001 -G nodejs

# Copy only necessary files
COPY --from=deps --chown=uplift:nodejs /app/node_modules ./node_modules
COPY --chown=uplift:nodejs package*.json ./
COPY --chown=uplift:nodejs src ./src

# Create temp directory for any runtime needs
RUN mkdir -p /app/tmp && chown uplift:nodejs /app/tmp

# Set environment
ENV NODE_ENV=production
ENV PORT=3000

# Switch to non-root user
USER uplift

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

EXPOSE 3000

# Use node directly (not npm) for proper signal handling
CMD ["node", "src/index.js"]
