FROM node:18-alpine

WORKDIR /app

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
