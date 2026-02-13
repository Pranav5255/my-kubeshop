# Deployment Guide - GCP VM

## Prerequisites

- Ubuntu 22.04 VM running on GCP
- k3s installed (`curl -sfL https://get.k3s.io | sh -`)
- Node.js 18+ installed
- User has sudo privileges

**Note:** Nginx is automatically installed by the deployment script if not already present.

## Initial Deployment

1. SSH into VM
2. Clone repository
3. Run deployment script:

```bash
cd kubernetes-shopify-infra
chmod +x deployment/*.sh
./deployment/deploy-vm.sh
```

## Service Management

### Start/Stop Services

```bash
# Start
./deployment/service-control.sh start

# Stop
./deployment/service-control.sh stop

# Restart
./deployment/service-control.sh restart

# Status
./deployment/service-control.sh status

# View logs
./deployment/service-control.sh logs
```

### Manual Commands

```bash
# Backend service
sudo systemctl start urumi-backend
sudo systemctl stop urumi-backend
sudo systemctl restart urumi-backend
sudo systemctl status urumi-backend
sudo journalctl -u urumi-backend -f

# Nginx
sudo systemctl restart nginx
sudo systemctl status nginx
sudo nginx -t
```

## Updating Application

When you make code changes:

```bash
./deployment/update-app.sh
```

## Troubleshooting

### Backend won't start

```bash
# Check logs
sudo journalctl -u urumi-backend -n 50

# Check if port 3001 is in use
sudo lsof -i :3001

# Test backend manually
cd backend
node dist/index.js
```

### Frontend not loading

```bash
# Check Nginx config
sudo nginx -t

# Check Nginx logs
sudo tail -f /var/log/nginx/error.log

# Verify files exist
ls -la /var/www/html/urumi/
```

### Can't connect to k3s

```bash
# Check k3s is running
sudo systemctl status k3s

# Fix kubeconfig permissions
sudo chmod 644 /etc/rancher/k3s/k3s.yaml

# Test kubectl
kubectl get nodes
```

## Uninstallation

```bash
# Stop and disable services
sudo systemctl stop urumi-backend
sudo systemctl disable urumi-backend

# Remove service file
sudo rm /etc/systemd/system/urumi-backend.service

# Remove frontend files
sudo rm -rf /var/www/html/urumi

# Remove Nginx config
sudo rm /etc/nginx/sites-enabled/urumi
sudo rm /etc/nginx/sites-available/urumi

# Reload systemd
sudo systemctl daemon-reload
```
