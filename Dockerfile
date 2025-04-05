# ---------- Stage 1: Build React Frontend ----------
    FROM node:18.20.7 as frontend-builder

    WORKDIR /app/frontend
    
    COPY frontend/package*.json ./
    RUN npm install --legacy-peer-deps
    
    COPY frontend/ ./
    RUN npm run build
    
    # ---------- Stage 2: Backend + Built Frontend ----------
    FROM node:18.20.7
    
    WORKDIR /app
    
    # Copy backend files
    COPY backend/package*.json ./backend/
    RUN cd backend && npm install
    
    COPY backend ./backend
    
    # Copy built frontend into backend's build folder
    COPY --from=frontend-builder /app/frontend/build ./backend/build
    
    # Set working directory to backend
    WORKDIR /app/backend
    
    # Set environment variables
    ENV NODE_ENV=production
    ENV PORT=8443
    
    # Expose the backend port
    EXPOSE 8443
    
    # Start the backend server
    CMD ["node", "server.js"]