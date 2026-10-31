#!/usr/bin/env bash
set -e

echo "=== DEPLOY START ==="

# Backend
echo "[1/6] Backend - install dependencies"
cd ~/apps/backend
npm ci

echo "[2/6] Backend - prisma generate"
npx prisma generate --schema prisma/schema.prisma

echo "[3/6] Backend - build"
npm run build

echo "[4/6] Backend - prisma migrate deploy"
npx prisma migrate deploy --schema prisma/schema.prisma

# Frontend
echo "[5/6] Frontend - install dependencies and build"
cd ~/apps/frontend
npm ci
npm run build

# PM2
echo "[6/6] PM2 - restart processes"
pm2 restart api || pm2 start ~/apps/backend/ecosystem.config.js
pm2 restart reminders || pm2 start ~/apps/backend/ecosystem.config.js
pm2 restart whatsapp-inbox || pm2 start ~/apps/backend/ecosystem.config.js
pm2 restart web || pm2 start ~/apps/frontend/ecosystem.config.js
pm2 save

echo "=== DEPLOY COMPLETE ==="
pm2 ls
