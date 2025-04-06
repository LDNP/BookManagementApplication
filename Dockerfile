# ---------- Stage 1: Build Frontend ----------
    FROM node:18.20.7 AS frontend-builder

    WORKDIR /app/frontend
    
    COPY frontend/package*.json ./
    RUN npm install --legacy-peer-deps
    
    COPY frontend/ ./
    RUN npm run build
    
    # ---------- Stage 2: Backend + Built Frontend ----------
    FROM node:18.20.7
    
    WORKDIR /app
    
    # Copy backend dependencies and install
    COPY backend/package*.json ./backend/
    RUN cd backend && npm install --legacy-peer-deps
    
    # Copy backend code
    COPY backend ./backend
    
    # Copy built frontend into backend build folder
    COPY --from=frontend-builder /app/frontend/build ./backend/build
    
    WORKDIR /app/backend
    
    ENV NODE_ENV=production
    ENV PORT=8443
    
    EXPOSE 8443
    
    CMD ["node", "server.js"]