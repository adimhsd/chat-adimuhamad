# Build stage
FROM node:20-slim AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./
COPY next.config.ts ./
COPY postcss.config.mjs ./
COPY eslint.config.mjs ./

# Install dependencies
RUN rm -f package-lock.json && npm install && npm cache clean --force

# Copy source code and env files
COPY src ./src
COPY public ./public
COPY .env.local ./

# Build Next.js app
RUN npm run build

# Production stage
FROM node:20-slim

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN rm -f package-lock.json && npm install --omit=dev && npm cache clean --force

# Copy built app from builder
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY ingest-postgres.js ./
COPY docs ./docs

# Create non-root user (Debian style)
RUN groupadd -g 1001 nodejs && \
    useradd -s /bin/sh -u 1001 -g nodejs nextjs

USER nextjs

ENV PORT=3001
ENV NODE_ENV=production

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/api/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Run app directly
CMD ["npm", "start"]
