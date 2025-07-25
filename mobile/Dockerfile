# Mobile App Dockerfile for Kubernetes deployment
FROM node:18-alpine AS builder

# Install dependencies for native builds
RUN apk add --no-cache python3 make g++ 

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Build the React Native bundle for production
RUN npx react-native bundle \
    --platform android \
    --dev false \
    --entry-file index.js \
    --bundle-output android/app/src/main/assets/index.android.bundle \
    --assets-dest android/app/src/main/res

# Production stage
FROM node:18-alpine

WORKDIR /app

# Install serve to host the bundle
RUN npm install -g serve

# Copy built assets
COPY --from=builder /app/android/app/src/main/assets/ ./assets/
COPY --from=builder /app/android/app/src/main/res/ ./res/

# Create a simple server to serve mobile assets and health check
COPY <<EOF /app/server.js
const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 8081;

// Serve static assets
app.use('/assets', express.static(path.join(__dirname, 'assets')));
app.use('/res', express.static(path.join(__dirname, 'res')));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy', service: 'wavesight-mobile' });
});

// Mobile app download endpoint
app.get('/download', (req, res) => {
  const platform = req.query.platform || 'android';
  if (platform === 'android') {
    res.json({
      downloadUrl: '/assets/index.android.bundle',
      version: '2.0.0',
      platform: 'android'
    });
  } else {
    res.status(404).json({ error: 'Platform not supported' });
  }
});

// App metadata
app.get('/app-info', (req, res) => {
  res.json({
    name: 'WaveSight Mobile',
    version: '2.0.0',
    platform: 'React Native',
    features: ['trend-spotting', 'real-time-updates', 'offline-support']
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(\`Mobile service running on port \${PORT}\`);
});
EOF

# Install express for the server
RUN npm install express

EXPOSE 8081

CMD ["node", "server.js"]