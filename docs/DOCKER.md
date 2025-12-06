# Dockerfile Improvements Summary

This document summarizes the improvements made to the Docker configuration.

---

## 🐳 Changes Made

### 1. **Use pnpm Instead of npm**

-   **Before**: Used `npm install` (inconsistent with `package.json`)
-   **After**: Uses `pnpm` matching the `packageManager` field in `package.json`
-   **Benefit**: Consistency across development and production environments

### 2. **Removed Unused EXPOSE Directive**

-   **Before**: `EXPOSE 3000` (bot doesn't listen on any port)
-   **After**: Removed entirely
-   **Benefit**: No confusion about what ports the bot uses

### 3. **Use Frozen Lockfile**

-   **Before**: `npm install --omit=dev`
-   **After**: `pnpm install --frozen-lockfile --prod`
-   **Benefit**: Deterministic builds with exact package versions

### 4. **Create Data Directory**

-   **Added**: `RUN mkdir -p /app/data && chmod 755 /app/data`
-   **Benefit**: Ensures data directory exists with proper permissions

### 5. **Better Comments**

-   Added clearer comments explaining each stage
-   Documented the purpose of each step

---

## 📋 Updated Dockerfile

```dockerfile
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
```

---

## 🚀 Building the Image

```bash
# Build the image
docker build -t tremor-watch .

# Run the container with environment file
docker run -d \
  --name tremor-watch \
  --env-file .env \
  -v $(pwd)/data:/app/data \
  tremor-watch

# View logs
docker logs -f tremor-watch
```

---

## 📦 Docker Compose Example

Create a `docker-compose.yml` file:

```yaml
version: "3.8"

services:
    tremor-watch:
        build: .
        container_name: tremor-watch
        env_file:
            - .env
        volumes:
            - ./data:/app/data
        restart: unless-stopped
```

Then run:

```bash
docker compose up -d
```

---

## 🔍 Existing .dockerignore

The project already has a `.dockerignore` file which excludes:

-   `node_modules/` - Will be installed in the container
-   `.env` files - Secrets shouldn't be in the image
-   `data/` - Database is mounted as a volume
-   IDE and OS files

This is already well-configured! ✅

---

## ✨ Benefits

1. **Consistency** - Uses same package manager everywhere
2. **Security** - No exposed ports, secrets via environment
3. **Reliability** - Frozen lockfile ensures reproducible builds
4. **Optimization** - Multi-stage build keeps image size small
5. **Persistence** - Data directory properly configured

---

## 📝 Migration Notes

If you have an existing container:

```bash
# Stop and remove old container
docker stop tremor-watch
docker rm tremor-watch

# Rebuild with new Dockerfile
docker build -t tremor-watch .

# Start new container
docker run -d \
  --name tremor-watch \
  --env-file .env \
  -v $(pwd)/data:/app/data \
  tremor-watch
```

Your data will be preserved in the `./data` directory!

---

For more information, see the main [README.md](file:///Users/adrianbonpin/Documents/Code/personal/ranquake-discod-bot/README.md).
