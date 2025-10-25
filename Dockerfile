# --- Stage 1: Build/Install Dependencies ---
FROM node:20-slim AS builder

WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev

# --- Stage 2: Final Runtime Image ---
FROM node:20-slim

WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules
COPY . .

VOLUME /app/data
EXPOSE 3000

CMD [ "npm", "run", "deploy" ]