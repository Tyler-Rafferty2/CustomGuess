FROM node:20

WORKDIR /app

# Only copy package files first — use Docker cache for npm install
COPY package*.json ./

# Install deps (use cache unless package.json changes)
RUN npm install --legacy-peer-deps

# Copy everything else
COPY . .

EXPOSE 3000
CMD ["npm", "run", "dev"]
