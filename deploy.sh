echo "Starting deploy script..."

mkdir -p backend

# Write SSL certificate and key from base64 environment variables
echo "Creating SSL certificate and private key from environment variables"
echo "$SERVER" | base64 -d > backend/server.crt
echo "$KEY" | base64 -d > backend/privatekey.pem

# Set correct permissions
echo "Setting permissions and ownership..."
chown ubuntu:ubuntu backend/server.crt backend/privatekey.pem
chmod 644 backend/server.crt
chmod 600 backend/privatekey.pem

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
cd ..

# Go to frontend and build it
echo "Installing frontend dependencies and building..."
cd frontend
npm install --legacy-peer-deps

export REACT_APP_API_BASE=https://34.251.18.39:8443

npm run build || { echo "React build failed"; exit 1; }

if [[ ! -f build/index.html ]]; then
  echo "Build output missing index.html — stopping deploy."
  exit 1
fi

# Copy frontend build to backend with absolute path
echo "Copying frontend build to backend..."
cp -r ~/BookManagementApplication/frontend/build/* ~/BookManagementApplication/backend/build/

# Update backend .env
echo "Updating backend .env file..."
cat > ~/BookManagementApplication/backend/.env <<EOL
CORS_ORIGIN=*
PORT=8443
NODE_ENV=production
SSL_KEY_PATH=./privatekey.pem
SSL_CERT_PATH=./server.crt
EOL

# Start or restart the app with PM2
cd ~/BookManagementApplication/backend
echo "Starting app with PM2..."
pm2 restart book_app || pm2 start server.js --name book_app
pm2 save

echo "Deployment complete."