# Build stage for frontend
FROM node:20-alpine AS frontend-builder

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci

# Copy source files
COPY . .

# Build frontend
RUN npm run build

# Build stage for backend API
FROM node:20-alpine AS backend-builder

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci

# Copy API source
COPY api/ ./api/
COPY backend/ ./backend/
COPY tsconfig.api.json ./

# Build backend
RUN npm run build:api

# Production stage
FROM node:20-alpine

WORKDIR /app

# Install production dependencies only
COPY package*.json ./
RUN npm ci --production

# Copy built frontend
COPY --from=frontend-builder /app/dist ./dist

# Copy built backend
COPY --from=backend-builder /app/dist-api ./dist-api

# Copy backend source (needed for some imports)
COPY backend/ ./backend/

# Copy server and config files
COPY server.mjs ./
COPY knexfile.cjs ./
COPY knexfile.ts ./

# Expose port (Railway will override with PORT env var)
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:'+process.env.PORT+'/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start server
CMD ["node", "server.mjs"]
