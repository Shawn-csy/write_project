# Simple single-stage image for Cloud Run
FROM node:20-alpine
WORKDIR /app

# Install deps
COPY package*.json ./
RUN npm ci

# Build app
COPY . .
RUN npm run build

EXPOSE 8080

CMD ["node", "server.js"]
