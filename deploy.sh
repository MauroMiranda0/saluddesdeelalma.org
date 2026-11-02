#!/usr/bin/env bash
set -e

echo "=== DEPLOY START ==="

# Preflight: validate production environment before touching the server
echo "[0/7] Backend - validate production environment"
cd ~/apps/backend
ENV_FILE="${ENV_FILE:-}"
if [ -z "$ENV_FILE" ]; then
  if [ -f .env.production ]; then
    ENV_FILE=".env.production"
  else
    ENV_FILE=".env"
  fi
fi
node scripts/validate-production-env.mjs "$ENV_FILE"

# Backend
echo "[1/7] Backend - install dependencies"
npm ci

echo "[2/7] Backend - prisma generate"
npx prisma generate --schema prisma/schema.prisma

echo "[3/7] Backend - build"
npm run build

echo "[4/7] Backend - prisma migrate deploy"
npx prisma migrate deploy --schema prisma/schema.prisma

# Frontend
echo "[5/7] Frontend - install dependencies and build"
cd ~/apps/frontend
npm ci
npm run build

# PM2
echo "[6/7] PM2 - restart processes"
pm2 restart api || pm2 start ~/apps/backend/ecosystem.config.js
pm2 restart reminders || pm2 start ~/apps/backend/ecosystem.config.js
pm2 restart whatsapp-inbox || pm2 start ~/apps/backend/ecosystem.config.js
pm2 restart web || pm2 start ~/apps/frontend/ecosystem.config.js
pm2 save

echo "=== DEPLOY COMPLETE ==="
pm2 ls
