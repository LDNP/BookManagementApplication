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

# Decode base64 SSL certificates
echo "Decoding and creating SSL private key"
echo "$PRIVATE_KEY" | base64 -d > backend/privatekey.pem
chmod 400 backend/privatekey.pem

echo "Decoding and creating SSL certificate"
echo "$SERVER" | base64 -d > backend/server.crt
chmod 400 backend/server.crt

# Verify certificates exist and are not empty
if [[ ! -s backend/privatekey.pem || ! -s backend/server.crt ]]; then
   echo "SSL certificate files could not be created or are empty."
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

# Update CORS settings in .env file
echo "CORS_ORIGIN=*" > ../backend/.env
echo "PORT=8443" >> ../backend/.env

# Start the app with PM2
cd ../backend
pm2 start server.js --name book_app
pm2 save