#Node 22
FROM node:22-alpine

#Setting Up folder - container
WORKDIR /app

COPY package*.json ./

#RUN npm install
RUN npm config set fetch-retry-maxtimeout 600000 \
    && npm config set fetch-retry-mintimeout 10000 \
    && npm config set fetch-retries 5 \
    && npm install
RUN npm install -g @expo/ngrok@^4.1.0

# Code
COPY . .

# Expose the ports Expo uses (Metro Bundler)
EXPOSE 8081 19000 19001 19002

# Start the app - locally, but with --tunnel
CMD ["npx", "expo", "start", "--tunnel"]