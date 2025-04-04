#!/bin/bash

echo "Starting deploy script..."

# Create SSL certificate from environment variable
echo "Creating SSL certificate from \$SERVER"
sudo bash -c "echo \"-----BEGIN CERTIFICATE-----\" > backend/server.crt"
sudo bash -c "echo \"$SERVER\" >> backend/server.crt"
sudo bash -c "echo \"-----END CERTIFICATE-----\" >> backend/server.crt"
sudo chmod 400 backend/server.crt

# Create SSL private key from environment variable
echo "Creating private key from \$KEY"
sudo bash -c "echo \"-----BEGIN PRIVATE KEY-----\" > backend/privatekey.pem"
sudo bash -c "echo \"$KEY\" >> backend/privatekey.pem"
sudo bash -c "echo \"-----END PRIVATE KEY-----\" >> backend/privatekey.pem"
sudo chmod 400 backend/privatekey.pem

# Verify certificates exist
if [[ ! -f backend/privatekey.pem || ! -f backend/server.crt ]]; then
  echo "SSL certificate files could not be created."
  exit 1
fi

echo "SSL certificates created successfully."

# Install backend dependencies
echo "Installing backend dependencies..."
cd backend
npm install

# Go to frontend and build it
echo "Installing frontend dependencies and building..."
cd ../frontend
npm install --legacy-peer-deps
export REACT_APP_API_BASE=https://34.251.18.39:8443
npm run build

# Copy frontend build to backend
echo "Copying frontend build to backend..."
mkdir -p ../backend/build
cp -r build/* ../backend/build/

# Update .env for backend
echo "Updating backend .env file..."
cat > ../backend/.env <<EOL
CORS_ORIGIN=*
PORT=8443
NODE_ENV=production
SSL_KEY_PATH=./privatekey.pem
SSL_CERT_PATH=./server.crt
EOL

# Start app with PM2
cd ../backend
echo "Starting app with PM2..."
pm2 start server.js --name book_app
pm2 save

echo "Deployment complete."