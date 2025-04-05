FROM node:18.20.7

ENV NODE_ENV=production
WORKDIR /app

# Install only necessary files first
COPY package*.json ./
RUN npm install --legacy-peer-deps

# Copy everything else
COPY . .

EXPOSE 8443
CMD ["npm", "start"]