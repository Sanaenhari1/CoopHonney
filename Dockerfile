FROM node:20-bullseye-slim

WORKDIR /app

COPY package*.json ./
RUN npm install --legacy-peer-deps

COPY . .

# Construire le frontend (crée le dossier 'dist')
RUN npm run build

EXPOSE 3001

# Lancer uniquement le backend (qui servira aussi le frontend)
CMD ["node", "backend/server.js"]