#!/bin/bash
set -e

echo "Updating Urumi application..."

# Pull latest code (if using git)
if [ -d .git ]; then
  echo "[1/4] Pulling latest code..."
  git pull
fi

# Rebuild backend
echo "[2/4] Rebuilding backend..."
cd backend
npm install --production
npm run build
cd ..

# Rebuild frontend
echo "[3/4] Rebuilding frontend..."
cd frontend
npm install
npm run build
sudo cp -r dist/* /var/www/html/urumi/
cd ..

# Restart services
echo "[4/4] Restarting services..."
sudo systemctl restart urumi-backend
sudo systemctl reload nginx

echo ""
echo "Update complete!"
echo "Backend status:"
sudo systemctl status urumi-backend --no-pager
