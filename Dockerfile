# Simple single-stage image for Cloud Run
FROM node:20-alpine
WORKDIR /app

# Install deps
COPY package*.json ./
RUN npm ci

# Build app
COPY . .
RUN npm run build

# Serve built assets with Vite preview (simple, not the smallest)
ENV HOST=0.0.0.0
ENV PORT=8080
EXPOSE 8080
CMD ["sh", "-c", "npm run preview -- --host ${HOST} --port ${PORT}"]
