FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# Build the Next.js app for production
RUN npm run build

EXPOSE 3000

# Use production start command
CMD ["npm", "start"]