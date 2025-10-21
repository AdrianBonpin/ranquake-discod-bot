# --- Stage 1: Build/Install Dependencies ---
# Use a lightweight Node.js base image
FROM node:20-slim AS builder

# Set the working directory inside the container
WORKDIR /app

# Copy package.json and package-lock.json (or yarn.lock)
# We copy these first to leverage Docker's build cache
COPY package*.json ./

# Install project dependencies
RUN npm install --omit=dev

# --- Stage 2: Final Runtime Image ---
# Start from a clean, even smaller base image
FROM node:20-slim

# Set the final working directory
WORKDIR /app

# Copy installed dependencies from the builder stage
COPY --from=builder /app/node_modules ./node_modules

# Copy the rest of your application code
# This includes index.js, package.json, and the scripts/ and commands/ folders
COPY . .

# Expose the port your application might be listening on (e.g., for health checks, though not strictly needed for a Discord bot)
EXPOSE 3000

# Define the command to run your application when the container starts
# Replace 'index.js' with your main file name if it's different
CMD [ "npm", "run", "deploy" ]