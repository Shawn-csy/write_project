FROM node:20-alpine

WORKDIR /app

# Install build dependencies for native modules (better-sqlite3)
RUN apk add --no-cache python3 make g++

COPY package*.json ./

RUN npm install --production

COPY . .

# Create directory for database persistence
RUN mkdir -p /data
# Set environment variable for DB path
ENV DB_PATH=/data/scripts.db
ENV PORT=1091

EXPOSE 1091

CMD ["node", "index.js"]
