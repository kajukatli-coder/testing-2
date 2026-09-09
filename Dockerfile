# Use official Node.js lightweight Alpine image
FROM node:20-alpine

# Set working directory inside container
WORKDIR /app

# Copy package files and install production dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy application source files
COPY server.js ./
COPY public/ ./public/

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000

# Expose container port
EXPOSE 3000

# Start application
CMD ["node", "server.js"]
