#!/usr/bin/env bash

# Update packages and install Node.js & npm
sudo apt update && sudo apt install -y nodejs npm

# Install PM2 if not already installed
sudo npm install -g pm2

# Navigate to the project directory
cd ~/BookManagementApplication || exit 1

# Stop the current running application (if running)
pm2 stop book_app || true

# Set environment variable for production mode
export NODE_ENV=production

# Decode base64 SSL certificates and write to files
echo "$PRIVATE_KEY" | base64 -d > backend/privatekey.pem
echo "$SERVER" | base64 -d > backend/server.crt

# Set proper permissions on key files
chmod 600 backend/privatekey.pem
chmod 644 backend/server.crt

# Install backend dependencies
cd backend
npm install

# Build the frontend (only if needed)
cd ../frontend
npm install --legacy-peer-deps
npm run build

# Copy frontend build to backend directory where server.js expects it
mkdir -p ../backend/build
cp -r build/* ../backend/build/

# Start the application with PM2
cd ../backend
pm2 start server.js --name book_app

# Save the PM2 process list so it starts on reboot
pm2 save