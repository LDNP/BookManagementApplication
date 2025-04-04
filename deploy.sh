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

# Create SSL certificates from environment variables 
echo "Creating SSL private key from environment variable" 
echo "-----BEGIN PRIVATE KEY-----" > backend/privatekey.pem 
echo "$PRIVATE_KEY" >> backend/privatekey.pem 
echo "-----END PRIVATE KEY-----" >> backend/privatekey.pem 
chmod 400 backend/privatekey.pem  

echo "Creating SSL certificate from environment variable" 
echo "-----BEGIN CERTIFICATE-----" > backend/server.crt 
echo "$SERVER" >> backend/server.crt 
echo "-----END CERTIFICATE-----" >> backend/server.crt 
chmod 400 backend/server.crt  

# Verify certificates exist 
if [[ ! -f backend/privatekey.pem || ! -f backend/server.crt ]]; then   
  echo "SSL certificate files could not be created."   
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