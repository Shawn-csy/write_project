# Build stage
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Serve static assets with a tiny server
FROM ghcr.io/static-web-server/static-web-server:2
ENV SERVER_ROOT=/var/www
COPY --from=build /app/dist /var/www
EXPOSE 8080
CMD ["/bin/sh", "-c", "static-web-server --port ${PORT:-8080} --root ${SERVER_ROOT} --compression auto"]
