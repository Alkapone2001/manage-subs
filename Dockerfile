FROM node:20-slim

# Create app directory
WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN apt-get update && apt-get install -y python3 make g++ && \
  npm ci --only=production --build-from-source=sqlite3 && \
  apt-get remove --purge -y python3 make g++ && apt-get autoremove -y && rm -rf /var/lib/apt/lists/*

# Copy app
COPY . ./

ENV NODE_ENV=production
EXPOSE 3000

# Ensure persistent DB lives at /data and symlink into app directory
CMD mkdir -p /data \
  && touch /data/subscriptions.db \
  && ln -sf /data/subscriptions.db /app/subscriptions.db \
  && node server.js
