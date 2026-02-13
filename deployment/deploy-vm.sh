#!/bin/bash
set -e

echo "=========================================="
echo "Urumi Platform - VM Deployment"
echo "=========================================="

# Detect environment
USERNAME=$(whoami)
PROJECT_DIR=$(pwd)
VM_IP=$(curl -s ifconfig.me)

echo "Detected configuration:"
echo "  User: $USERNAME"
echo "  Project: $PROJECT_DIR"
echo "  VM IP: $VM_IP"
echo ""

# 0. Install Nginx if not already installed
echo "[0/7] Checking Nginx installation..."
if ! command -v nginx &> /dev/null; then
    echo "Nginx not found. Installing..."
    sudo apt update
    sudo apt install -y nginx
    echo "Nginx installed successfully"
else
    echo "Nginx already installed"
fi
echo ""

# 1. Build backend
echo "[1/7] Building backend..."
cd backend
npm install --production
npm run build
cd ..

# 2. Build frontend
echo "[2/7] Building frontend..."
cd frontend
npm install
npm run build
cd ..

# 3. Install backend systemd service
echo "[3/7] Installing backend systemd service..."
sudo cp deployment/urumi-backend.service /etc/systemd/system/
sudo sed -i "s|REPLACE_WITH_USERNAME|$USERNAME|g" /etc/systemd/system/urumi-backend.service
sudo sed -i "s|REPLACE_WITH_PROJECT_PATH|$PROJECT_DIR|g" /etc/systemd/system/urumi-backend.service
sudo sed -i "s|REPLACE_WITH_VM_IP|$VM_IP|g" /etc/systemd/system/urumi-backend.service

# 4. Deploy frontend to Nginx
echo "[4/7] Deploying frontend..."
sudo mkdir -p /var/www/html/urumi
sudo cp -r frontend/dist/* /var/www/html/urumi/
sudo chown -R www-data:www-data /var/www/html/urumi

# 5. Configure Nginx
echo "[5/7] Configuring Nginx..."
sudo cp deployment/nginx-urumi.conf /etc/nginx/sites-available/urumi
sudo ln -sf /etc/nginx/sites-available/urumi /etc/nginx/sites-enabled/default
sudo nginx -t

# 6. Start services
echo "[6/7] Starting services..."
sudo systemctl daemon-reload
sudo systemctl enable urumi-backend
sudo systemctl restart urumi-backend

# 7. Enable and start Nginx
echo "[7/7] Starting Nginx..."
sudo systemctl enable nginx
sudo systemctl restart nginx

echo ""
echo "=========================================="
echo "Deployment complete!"
echo "=========================================="
echo ""
echo "Backend status:"
sudo systemctl status urumi-backend --no-pager
echo ""
echo "Access your dashboard at: http://$VM_IP"
echo "Backend API: http://$VM_IP:3001/health"
echo ""
echo "Useful commands:"
echo "  View backend logs: sudo journalctl -u urumi-backend -f"
echo "  Restart backend: sudo systemctl restart urumi-backend"
echo "  Stop backend: sudo systemctl stop urumi-backend"
echo "  Backend status: sudo systemctl status urumi-backend"
echo ""
