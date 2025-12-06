# --- Stage 1: Build TypeScript ---
FROM node:20-slim AS builder

# Install pnpm globally
RUN npm install -g pnpm@10.19.0

WORKDIR /app

# Copy package files and TypeScript config
COPY package.json pnpm-lock.yaml* tsconfig.json ./

# Install all dependencies (including dev dependencies for building)
RUN pnpm install --frozen-lockfile

# Copy source files
COPY src ./src

# Build TypeScript
RUN pnpm build

# --- Stage 2: Final Runtime Image ---
FROM node:20-slim

WORKDIR /app

# Copy built files from builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

# Create data directory with proper permissions
RUN mkdir -p /app/data && chmod 755 /app/data

# Mount volume for persistent data
VOLUME /app/data

# Run the bot
CMD [ "node", "--env-file=.env", "dist/index.js" ]