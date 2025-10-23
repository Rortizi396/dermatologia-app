FROM node:20-alpine

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies (use --omit=dev to keep image small)
# Copy package manifests first so Docker can cache dependency install
COPY package*.json ./
RUN npm ci --omit=dev --no-audit --no-fund || npm install --omit=dev --no-audit --no-fund

# Copy only backend runtime files to keep build context small
# server.js is the main entrypoint; if you add other backend modules, copy them explicitly
COPY server.js ./

# Expose port
EXPOSE 3000

# Default environment variables (override on deployment)
ENV PORT=3000
ENV DB_HOST=localhost
ENV DB_USER=root
ENV DB_PASSWORD=root
ENV DB_NAME=dermatologico
ENV JWT_SECRET=secreto

CMD ["node", "server.js"]
