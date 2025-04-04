#!/usr/bin/env bash

# Ensure backend directory exists with correct permissions
sudo mkdir -p ~/BookManagementApplication/backend
sudo chown -R ubuntu:ubuntu ~/BookManagementApplication/backend

# Update and install dependencies 
sudo apt update && sudo apt install -y nodejs npm
sudo npm install -g pm2  

# Navigate to the project directory 
cd ~/BookManagementApplication || exit 1  

# Stop the app if running 
pm2 stop book_app || true  

# Set environment 
export NODE_ENV=production  

# Create SSL certificates from environment variables 
echo "Creating SSL private key from environment variable"
# Use sudo to ensure write permissions
sudo bash -c "printf -- \"-----BEGIN PRIVATE KEY-----\n\" > ~/BookManagementApplication/backend/privatekey.pem"
sudo bash -c "printf \"%s\n\" \"$PRIVATE_KEY\" >> ~/BookManagementApplication/backend/privatekey.pem"
sudo bash -c "printf -- \"-----END PRIVATE KEY-----\n\" >> ~/BookManagementApplication/backend/privatekey.pem"
sudo chmod 400 ~/BookManagementApplication/backend/privatekey.pem

echo "Creating SSL certificate from environment variable"
sudo bash -c "printf -- \"-----BEGIN CERTIFICATE-----\n\" > ~/BookManagementApplication/backend/server.crt"
sudo bash -c "printf \"%s\n\" \"$SERVER\" >> ~/BookManagementApplication/backend/server.crt"
sudo bash -c "printf -- \"-----END CERTIFICATE-----\n\" >> ~/BookManagementApplication/backend/server.crt"
sudo chmod 400 ~/BookManagementApplication/backend/server.crt

# Verify certificates exist and are not empty
if [[ ! -s ~/BookManagementApplication/backend/privatekey.pem || ! -s ~/BookManagementApplication/backend/server.crt ]]; then   
  echo "SSL certificate files could not be created or are empty."   
  exit 1 
fi  

# Ensure ubuntu user owns the files
sudo chown ubuntu:ubuntu ~/BookManagementApplication/backend/privatekey.pem
sudo chown ubuntu:ubuntu ~/BookManagementApplication/backend/server.crt

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