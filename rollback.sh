#!/usr/bin/env bash
set -e

echo "=== ROLLBACK START ==="

# Get previous commit
PREV_COMMIT=$(git -C ~/apps/repo rev-parse HEAD~1)
echo "Rolling back to: $PREV_COMMIT"

# Rollback backend
cd ~/apps/backend
git fetch origin
git reset --hard $PREV_COMMIT

npm ci
npx prisma generate --schema prisma/schema.prisma
npm run build
# Note: prisma migrate deploy not reverted automatically; migrations are forward-only

# Rollback frontend
cd ~/apps/frontend
git reset --hard $PREV_COMMIT
npm ci
npm run build

# Restart PM2
pm2 restart api
pm2 restart reminders
pm2 restart whatsapp-inbox
pm2 restart web
pm2 save

echo "=== ROLLBACK COMPLETE ==="
pm2 ls
