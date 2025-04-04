#!/usr/bin/env bash

# Update and install dependencies
sudo apt update && sudo apt install -y nodejs npm
sudo npm install -g pm2

# Navigate to the project directory
cd ~/BookManagementApplication || exit 1

# Stop the app if running
pm2 stop book_app || true

# Set environment
export NODE_ENV=production

# Make sure certs exist
if [[ ! -f backend/privatekey.pem || ! -f backend/server.crt ]]; then
  echo "SSL certificate files not found. Please ensure they're in backend/"
  exit 1
fi

# Install backend dependencies
cd backend
npm install

# Build frontend
cd ../frontend
npm install --legacy-peer-deps
export REACT_APP_API_BASE=https://34.251.18.39:8443
npm run build

# Copy frontend build to backend
mkdir -p ../backend/build
cp -r build/* ../backend/build/

# Start the app with PM2
cd ../backend
pm2 start server.js --name book_app
pm2 save