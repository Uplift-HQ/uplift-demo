# ============================================================
# UPLIFT API - Production Dockerfile (Monorepo)
# ============================================================

FROM node:20-alpine

WORKDIR /app

# Install security updates
RUN apk update && apk upgrade && rm -rf /var/cache/apk/*

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S uplift -u 1001 -G nodejs

# Copy API package files and install dependencies
COPY apps/api/package*.json ./
RUN npm install --omit=dev && npm cache clean --force

# Copy API source code
COPY apps/api/src ./src

# Set ownership
RUN chown -R uplift:nodejs /app

# Set environment
ENV NODE_ENV=production
ENV PORT=3000

# Switch to non-root user
USER uplift

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

EXPOSE 3000

CMD ["node", "src/index.js"]
