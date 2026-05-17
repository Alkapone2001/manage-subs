FROM node:20-slim

# Create app directory
WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy app
COPY . ./

ENV NODE_ENV=production
EXPOSE 3000

# Ensure persistent DB lives at /data and symlink into app directory
CMD mkdir -p /data \
  && touch /data/subscriptions.db \
  && ln -sf /data/subscriptions.db /app/subscriptions.db \
  && node server.js
