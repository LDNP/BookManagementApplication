#!/bin/bash

echo "Starting deploy script..."

# Clean previous build and install dependencies
rm -rf backend/build

# Install backend dependencies
echo "Installing backend dependencies..."
cd backend
npm install
cd ..

# Install frontend dependencies and build it
echo "Installing frontend dependencies and building..."
cd frontend
npm install --legacy-peer-deps
export REACT_APP_API_BASE=https://34.251.18.39:8443
npm run build

if [[ ! -f build/index.html ]]; then
  echo "Build output missing index.html — stopping deploy."
  exit 1
fi

# Copy frontend build to backend
echo "Copying frontend build to backend..."
cp -r frontend/build/* backend/build/

# Set up the environment variables
echo "Updating backend .env file..."
cat > backend/.env <<EOL
CORS_ORIGIN=*
PORT=8443
NODE_ENV=production
SSL_KEY_PATH=./privatekey.pem
SSL_CERT_PATH=./server.crt
EOL

# Set correct permissions for SSL certificates
echo "Setting permissions for SSL certificates..."
chmod 644 backend/server.crt
chmod 600 backend/privatekey.pem

# Verify certificates exist
if [[ ! -f backend/privatekey.pem || ! -f backend/server.crt ]]; then
  echo "SSL certificate files could not be created."
  exit 1
fi

echo "SSL certificates created successfully."

# Start or restart the app with PM2
cd backend
echo "Starting app with PM2..."
pm2 restart book_app || pm2 start server.js --name book_app
pm2 save

echo "Deployment complete."