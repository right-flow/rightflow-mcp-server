# Build stage for frontend
FROM node:20-alpine AS frontend-builder

# Force cache invalidation with timestamp file
COPY packages/app/.build-timestamp /tmp/.build-timestamp

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci

# Cache bust argument to force rebuild
ARG CACHE_BUST=v2.4.13-noEmitOnError-only-20260216-075000

# Copy source files
COPY . .

# Force cache invalidation - update timestamp for each release
RUN echo "Build version: 2.4.2 - Build time: $(date +%Y%m%d_%H%M%S)"

# Build-time environment variables for Vite
ARG VITE_CLERK_PUBLISHABLE_KEY
ARG VITE_CLERK_DOMAIN
ARG VITE_LANDING_URL
ARG VITE_ROOBZ_API_KEY
ARG VITE_ROOBZ_API_ENDPOINT
ARG VITE_API_BASE_URL

# Export as environment variables for the build process
ENV VITE_CLERK_PUBLISHABLE_KEY=$VITE_CLERK_PUBLISHABLE_KEY
ENV VITE_CLERK_DOMAIN=$VITE_CLERK_DOMAIN
ENV VITE_LANDING_URL=$VITE_LANDING_URL
ENV VITE_ROOBZ_API_KEY=$VITE_ROOBZ_API_KEY
ENV VITE_ROOBZ_API_ENDPOINT=$VITE_ROOBZ_API_ENDPOINT
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

# Build frontend
RUN npm run build

# Build stage for old backend API (api/ folder)
FROM node:20-alpine AS backend-builder

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci

# Copy api/ folder (legacy API code) and its dependencies
COPY api/ ./api/
COPY packages/app/src/lib/ ./packages/app/src/lib/
COPY packages/app/src/services/billing/ ./packages/app/src/services/billing/
COPY packages/app/src/services/data-sources/ ./packages/app/src/services/data-sources/
COPY packages/app/src/services/storage/ ./packages/app/src/services/storage/
COPY packages/app/src/services/forms/ ./packages/app/src/services/forms/
COPY packages/app/src/services/responses/ ./packages/app/src/services/responses/
COPY packages/app/src/services/auth/ ./packages/app/src/services/auth/
COPY packages/app/src/services/access-control/ ./packages/app/src/services/access-control/
COPY packages/app/src/services/organizations/ ./packages/app/src/services/organizations/
COPY packages/app/src/services/premium/ ./packages/app/src/services/premium/
COPY packages/app/src/services/url-shortener/ ./packages/app/src/services/url-shortener/
COPY tsconfig.api.json ./

# Build old backend API
RUN npm run build:api

# Build stage for new backend API (packages/app/backend/)
FROM node:20-alpine AS new-backend-builder

WORKDIR /app/packages/app/backend

# Copy backend package files
COPY packages/app/backend/package*.json ./

# Install backend dependencies
RUN npm ci

# Copy backend source
COPY packages/app/backend/ ./

# Build new backend
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Install production dependencies only
COPY package*.json ./
RUN npm ci --production

# Copy built frontend
COPY --from=frontend-builder /app/dist ./dist

# Copy built old backend
COPY --from=backend-builder /app/dist-api ./dist-api

# Copy built new backend (packages/app/backend)
COPY --from=new-backend-builder /app/packages/app/backend/dist ./backend-v1/dist
COPY --from=new-backend-builder /app/packages/app/backend/node_modules ./backend-v1/node_modules
COPY --from=new-backend-builder /app/packages/app/backend/package.json ./backend-v1/package.json

# Copy server and config files from packages/app (build context is repo root)
COPY packages/app/server.mjs ./
COPY packages/app/knexfile.cjs ./
COPY packages/app/knexfile.ts ./

# Expose port (Railway will override with PORT env var)
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:'+process.env.PORT+'/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start server
CMD ["node", "server.mjs"]
