# --- Stage 1: Build/Install Dependencies ---
FROM node:20-slim AS builder

# Install pnpm globally
RUN npm install -g pnpm@10.19.0

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml* ./

# Install dependencies using pnpm
RUN pnpm install --frozen-lockfile --prod

# --- Stage 2: Final Runtime Image ---
FROM node:20-slim

# Install pnpm in runtime image
RUN npm install -g pnpm@10.19.0

WORKDIR /app

# Copy node_modules from builder stage
COPY --from=builder /app/node_modules ./node_modules

# Copy application code
COPY . .

# Create data directory with proper permissions
RUN mkdir -p /app/data && chmod 755 /app/data

# Mount volume for persistent data
VOLUME /app/data

# Run the bot (uses .env from mounted volume or environment variables)
CMD [ "pnpm", "run", "deploy" ]