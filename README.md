# Urumi Store Provisioning Platform

**Enterprise-grade Kubernetes-native platform for provisioning e-commerce stores (WooCommerce, MedusaJS) on demand.**

A production-ready system designed for the Urumi AI SDE internship Round 1 assessment, featuring advanced observability, security, scalability, and multi-tenant isolation.

## 🚀 Quick Start

### Local Development (2 minutes)

```bash
# 1. Setup cluster and dependencies
bash scripts/setup-local.sh

# 2. Terminal 1: Start backend
cd backend && npm run dev

# 3. Terminal 2: Start frontend
cd frontend && npm run dev

# 4. Open dashboard
open http://localhost:5173
```

### Production VPS (k3s)

```bash
# 1. SSH into your VM
ssh user@<VM_IP>

# 2. Install k3s
curl -sfL https://get.k3s.io | sh -

# 3. Clone repository
git clone <your-repo-url>
cd kubernetes-shopify-infra

# 4. Install dependencies
cd backend && npm install && npm run build
cd ../frontend && npm install && npm run build

# 5. Set environment variables
export BASE_DOMAIN=$(curl -s ifconfig.me)
export NODE_ENV=production
export PORT=3001

# 6. Start backend (as systemd service or screen)
cd backend && node dist/index.js

# 7. Serve frontend via Nginx
sudo apt install nginx
sudo cp -r frontend/dist/* /var/www/html/

# 8. Access dashboard
open http://<VM_IP>

# 9. Create stores - they'll be accessible at:
# http://<store-name>.store.<VM_IP>.nip.io
```

See [SYSTEM_DESIGN.md](SYSTEM_DESIGN.md) for detailed architecture.

## 📋 Prerequisites

- **Kubernetes**: k3d/kind/minikube (local) or k3s (production)
- **Helm**: v3+
- **Node.js**: v18+
- **kubectl**: Configured to your cluster
- **Docker**: For k3d (local development)

## ✨ Key Features

### Core Functionality
- ✅ **Multi-tenant store provisioning** - Create WooCommerce or MedusaJS stores on demand
- ✅ **Automatic setup** - Products, payment gateways, and themes configured automatically
- ✅ **End-to-end order flow** - Complete e-commerce functionality out of the box
- ✅ **Namespace isolation** - Each store in its own Kubernetes namespace
- ✅ **Dynamic domain management** - nip.io wildcard DNS for local and production

### Advanced Features
- ✅ **Audit logging** - Complete operation history with timestamps and user tracking
- ✅ **Real-time metrics** - Success rates, provisioning times, active stores
- ✅ **Per-user quotas** - Prevent abuse with configurable store limits
- ✅ **Concurrency queue** - Fair provisioning with max 3 concurrent tasks
- ✅ **Network policies** - Deny-by-default with explicit allow rules
- ✅ **Resource quotas** - Per-store CPU/memory limits
- ✅ **Activity timeline** - Dashboard shows all operations with status
- ✅ **Error tracking** - Detailed failure reasons and recovery options

### Production Ready
- ✅ **Local-to-prod parity** - Same Helm charts, different values
- ✅ **Idempotent provisioning** - Safe to retry failed operations
- ✅ **Graceful cleanup** - All resources properly deleted on store removal
- ✅ **Horizontal scaling** - Stateless backend, queue-based provisioning
- ✅ **Comprehensive documentation** - Setup guides, API reference, troubleshooting

## 📊 Dashboard Features

### Stores Tab
- View all provisioned stores with status
- Real-time provisioning progress
- Quick access to store URLs
- One-click deletion with confirmation

### Metrics Tab
- Total stores created/failed/deleted
- Success rate percentage
- Average provisioning time
- Active stores count

### Activity Tab
- Audit log of all operations
- Timestamps for each action
- Success/failure indicators
- Error messages for failed operations

## 🏗️ Architecture

```
┌─────────────────────────────────────────┐
│   Frontend (React + Vite)               │
│   - Dashboard with real-time updates    │
│   - Metrics & activity visualization    │
└─────────────────────────────────────────┘
              ↓ HTTP
┌─────────────────────────────────────────┐
│   Backend (Node.js + Express)           │
│   - Store provisioning orchestration    │
│   - Audit logging & metrics             │
│   - Quota management & concurrency      │
└─────────────────────────────────────────┘
              ↓ kubectl/Helm
┌─────────────────────────────────────────┐
│   Kubernetes Cluster                    │
│   - Per-store namespaces                │
│   - WordPress + MariaDB pods            │
│   - NetworkPolicies & ResourceQuotas    │
│   - Persistent storage                  │
└─────────────────────────────────────────┘
```

## 🔒 Security

- **NetworkPolicies**: Deny-all default, explicit allow rules
- **ResourceQuotas**: Hard limits per store (2 CPU, 2GB RAM)
- **LimitRanges**: Pod defaults (250m CPU, 256Mi memory)
- **RBAC**: Minimal permissions for backend service account
- **Secrets**: Kubernetes-managed, not hardcoded
- **Non-root containers**: Bitnami images run as non-root

## 📈 Scalability

- **Horizontal**: Stateless backend, multiple instances supported
- **Concurrency**: Queue-based provisioning (max 3 concurrent)
- **Per-user quotas**: Max 10 stores per user
- **Provisioning timeout**: 10 minutes max per store
- **Cluster scaling**: Add nodes for more capacity

## 📚 Detailed Setup Instructions

### Local Setup (Step-by-Step)

#### Prerequisites
- Docker Desktop installed and running
- kubectl installed (`brew install kubectl` on macOS)
- Helm 3 installed (`brew install helm`)
- Node.js 18+ installed (`brew install node`)
- k3d installed (`brew install k3d`)

#### Step 1: Create k3d Cluster
```bash
# Create cluster with port mappings for ingress
k3d cluster create urumi \
  --port "80:80@loadbalancer" \
  --port "443:443@loadbalancer" \
  --api-port 6443 \
  --agents 1

# Verify cluster is ready
kubectl cluster-info
kubectl get nodes
```

#### Step 2: Setup Backend
```bash
cd backend

# Install dependencies
npm install

# Set environment variables
export BASE_DOMAIN="127.0.0.1"
export NODE_ENV="development"
export PORT=3001

# Start backend in dev mode (with nodemon)
npm run dev

# Backend will be available at http://localhost:3001
# Test: curl http://localhost:3001/health
```

#### Step 3: Setup Frontend
```bash
# In a new terminal
cd frontend

# Install dependencies
npm install

# Update API URL in .env or vite config if needed
# Default connects to http://localhost:3001

# Start frontend dev server
npm run dev

# Frontend will be available at http://localhost:5173
```

#### Step 4: Create Your First Store
1. Open http://localhost:5173
2. Click "New Store"
3. Name: `demo1`, Type: WooCommerce
4. Click "Create Store"
5. Wait 2-3 minutes (watch status in dashboard)
6. Once "Ready", click "Shop" button
7. Access store at: http://demo1.store.127.0.0.1.nip.io/

---

### Production VPS Setup (GCP/AWS/DigitalOcean)

#### Prerequisites
- VPS with Ubuntu 22.04 (minimum 4 vCPU, 8GB RAM recommended)
- Root or sudo access
- Ports 80 and 443 open in firewall


#### Step 2: Install k3s
```bash
# SSH into VM
ssh ubuntu@<VM_IP>

# Install k3s with default Traefik ingress
curl -sfL https://get.k3s.io | sh -

# Verify installation
sudo k3s kubectl get nodes

# Make kubectl accessible without sudo
sudo chmod 644 /etc/rancher/k3s/k3s.yaml
export KUBECONFIG=/etc/rancher/k3s/k3s.yaml

# Verify Traefik is running
kubectl get pods -n kube-system | grep traefik
```

#### Step 3: Install Helm
```bash
curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash

# Add required Helm repos
helm repo add bitnami https://charts.bitnami.com/bitnami
helm repo update
```

#### Step 4: Clone Repository
```bash
git clone https://github.com/your-username/kubernetes-shopify-infra.git
cd kubernetes-shopify-infra
```

#### Step 5: Setup Backend
```bash
# Install Node.js and npm
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Build backend
cd backend
npm install
npm run build

# Get VM public IP
VM_IP=$(curl -s ifconfig.me)
echo "Your VM IP: $VM_IP"

# Create systemd service
sudo tee /etc/systemd/system/urumi-backend.service > /dev/null <<EOF
[Unit]
Description=Urumi Store Backend API
After=network.target k3s.service

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/home/ubuntu/kubernetes-shopify-infra/backend
Environment="NODE_ENV=production"
Environment="PORT=3001"
Environment="BASE_DOMAIN=$VM_IP"
ExecStart=/usr/bin/node /home/ubuntu/kubernetes-shopify-infra/backend/dist/index.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# Start backend service
sudo systemctl daemon-reload
sudo systemctl enable urumi-backend
sudo systemctl start urumi-backend

# Check status
sudo systemctl status urumi-backend
curl http://localhost:3001/health
```

#### Step 6: Setup Frontend
```bash
cd frontend
npm install
npm run build

# Install Nginx
sudo apt update && sudo apt install -y nginx

# Copy built files
sudo rm -rf /var/www/html/*
sudo cp -r dist/* /var/www/html/

# Configure Nginx
sudo tee /etc/nginx/sites-available/default > /dev/null <<'EOF'
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    
    root /var/www/html;
    index index.html;
    
    server_name _;

    # Frontend
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Proxy API requests to backend
    location /stores {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
    
    location /metrics {
        proxy_pass http://localhost:3001;
    }
    
    location /quota {
        proxy_pass http://localhost:3001;
    }
    
    location /audit {
        proxy_pass http://localhost:3001;
    }
    
    location /queue {
        proxy_pass http://localhost:3001;
    }
    
    location /health {
        proxy_pass http://localhost:3001;
    }
}
EOF

# Test and reload Nginx
sudo nginx -t
sudo systemctl restart nginx
```

#### Step 7: Access Dashboard
```bash
VM_IP=$(curl -s ifconfig.me)
echo "Dashboard: http://$VM_IP"
echo "Backend Health: http://$VM_IP:3001/health"
```

#### Step 8: Create Store on Production
1. Open `http://<VM_IP>` in browser
2. Create store named `production-demo`
3. Wait for "Ready" status (2-3 minutes)
4. Access store at: `http://production-demo.store.<VM_IP>.nip.io/`
5. Place a test order following the steps above

---

### VPS Configuration Differences

When deploying stores on VPS, the backend automatically uses the correct domain:

```bash
# Local
export BASE_DOMAIN="127.0.0.1"
# Stores: http://store1.store.127.0.0.1.nip.io

# Production VPS (example: VM IP is 34.123.45.67)
export BASE_DOMAIN="34.123.45.67"
# Stores: http://store1.store.34.123.45.67.nip.io
```

The Helm charts use the same values, just with different hostnames injected at install time.

---

## 📚 Documentation

- **[SYSTEM_DESIGN.md](SYSTEM_DESIGN.md)** - Architecture, isolation, provisioning flow, security, tradeoffs
- **README.md** (this file) - Setup guides, usage, API reference

## 🧪 Testing

### Automated E2E Tests
```bash
bash scripts/test-e2e.sh
```

### Manual Testing
```bash
# Create store
curl -X POST http://localhost:3001/stores \
  -H "Content-Type: application/json" \
  -d '{"name":"test-store","type":"woocommerce"}'

# List stores
curl http://localhost:3001/stores

# Get metrics
curl http://localhost:3001/metrics

# Delete store
curl -X DELETE http://localhost:3001/stores/test-store
```

## 🎯 Usage

### Create a Store

1. **Open dashboard**: http://localhost:5173
2. **Click "New Store"** button
3. **Enter store name** (lowercase, alphanumeric, hyphens only, e.g., `demo1`)
4. **Select type**: WooCommerce (MedusaJS is stubbed)
5. **Click "Create Store"**
6. **Wait 2-3 minutes** for provisioning (watch status change from "Provisioning" to "Ready")

### Access Your Store

Once status shows **"Ready"**:
- **Shop URL**: `http://<store-name>.store.127.0.0.1.nip.io/` (or `http://<store-name>.store.<VM_IP>.nip.io/` on VPS)
- **Admin Panel**: `http://<store-name>.store.127.0.0.1.nip.io/wp-admin/`
- **Credentials**: 
  - Username: `user`
  - Password: `password`

### Place an Order (Definition of Done - WooCommerce)

This demonstrates the complete e-commerce flow required by the assessment:

#### Step 1: Browse Storefront
1. Open store URL: `http://<store-name>.store.127.0.0.1.nip.io/`
2. You'll see 5 pre-configured products:
   - Classic T-Shirt ($19.99)
   - Coffee Mug ($12.99)
   - Premium Notebook ($8.99)
   - Warm Beanie ($15.99)
   - Water Bottle ($24.99)

#### Step 2: Add to Cart
1. Click on any product
2. Click "Add to Cart"
3. Click "View Cart" (or navigate to `/cart/`)

#### Step 3: Checkout
1. Click "Proceed to Checkout"
2. Fill in billing details:
   - First Name: Test
   - Last Name: User
   - Address: 123 Main St
   - City: San Francisco
   - State: California
   - Zip: 94102
   - Email: test@example.com

#### Step 4: Select Payment Method
Choose one of the pre-configured payment gateways:
- **Cash on Delivery** - No payment processing
- **Dummy Payment Gateway** - Test gateway, no actual charge

#### Step 5: Place Order
1. Click "Place Order" button
2. You'll see "Order Received" confirmation page
3. Note the order number

#### Step 6: Verify in Admin Panel
1. Go to admin: `http://<store-name>.store.127.0.0.1.nip.io/wp-admin/`
2. Login with `user` / `password`
3. Navigate to: **WooCommerce → Orders**
4. Verify your order appears in the list
5. Click on the order to see full details





## 🚨 Troubleshooting

### Store Stuck in "Provisioning" Status

**Check pod status:**
```bash
kubectl get pods -n <store-name>

# If pods are not Running, check events
kubectl get events -n <store-name> --sort-by='.lastTimestamp'
```

**Common issues:**
- **ImagePullBackOff**: Check internet connectivity
- **Pending**: Check if cluster has enough resources
- **CrashLoopBackOff**: Check pod logs for errors

**Check WordPress logs:**
```bash
kubectl logs -n <store-name> -l app.kubernetes.io/name=wordpress

# Check setup script logs
kubectl exec -n <store-name> <wordpress-pod> -- cat /tmp/setup.log
```

---

### Store Showing 404 Not Found

**Check 1: Verify ingress is working**
```bash
kubectl get ingress -n <store-name>

# Should show your store hostname
# ADDRESS column should have an IP
```

**Check 2: Verify WordPress URLs are correct**
```bash
kubectl exec -n <store-name> <wordpress-pod> -- \
  wp option get home --allow-root

# Should output: http://<store-name>.store.<IP>.nip.io
```

**Check 3: Verify .htaccess exists**
```bash
kubectl exec -n <store-name> <wordpress-pod> -- \
  cat /opt/bitnami/wordpress/.htaccess

# Should show WordPress rewrite rules
```

**Check 4: Verify ingress class**
```bash
kubectl get ingress -n <store-name> -o yaml | grep ingressClassName

# Should show: ingressClassName: traefik
```

**Fix:** If still broken, run setup script manually:
```bash
kubectl exec -n <store-name> <wordpress-pod> -- \
  /bin/bash /scripts/setup.sh
```

---

### Products Not Showing in Store

**Check if WooCommerce is active:**
```bash
kubectl exec -n <store-name> <wordpress-pod> -- \
  wp plugin list --allow-root | grep woocommerce
```

**Check product count:**
```bash
kubectl exec -n <store-name> <wordpress-pod> -- \
  wp wc product list --user=1 --format=count --allow-root
```

**Re-run product creation:**
```bash
kubectl exec -n <store-name> <wordpress-pod> -- \
  wp wc product create --name="Test Product" --type=simple \
  --regular_price=19.99 --user=1 --allow-root
```

---

### Store Deletion Hangs

**Check namespace status:**
```bash
kubectl get namespace <store-name>

# If stuck in "Terminating"
```

**Check for stuck PVCs:**
```bash
kubectl get pvc -n <store-name>

# Force delete PVCs
kubectl patch pvc <pvc-name> -n <store-name> \
  -p '{"metadata":{"finalizers":[]}}' --type=merge
kubectl delete pvc --all -n <store-name> --force --grace-period=0
```

**Force delete namespace:**
```bash
kubectl delete namespace <store-name> --force --grace-period=0
```

---

### Backend API Not Responding

**Check backend logs:**
```bash
# Local
npm run dev 2>&1 | tee backend.log

# Production
sudo journalctl -u urumi-backend -f
```

**Common issues:**
- **ECONNREFUSED**: kubectl not configured correctly
- **Permission denied**: Service account needs RBAC permissions
- **Port already in use**: Another process on port 3001

**Test kubectl access:**
```bash
kubectl auth can-i create namespaces
kubectl get nodes
```

---

### DNS Resolution Issues

**Test nip.io:**
```bash
# Should resolve to your IP
nslookup demo1.store.127.0.0.1.nip.io

# Should resolve to 8.8.8.8
nslookup test.8.8.8.8.nip.io
```

**If nip.io is down:**
- Use alternative: `sslip.io`, `xip.io`, `traefik.me`
- Or set up local /etc/hosts entries (not recommended)

---

### Ingress Not Working

**Check Traefik is running:**
```bash
kubectl get pods -n kube-system | grep traefik
kubectl get svc -n kube-system | grep traefik
```

**Check ingress controller logs:**
```bash
kubectl logs -n kube-system -l app.kubernetes.io/name=traefik
```

**Verify ingress class:**
```bash
kubectl get ingressclass

# Should show: traefik
```

## 📦 Project Structure

```
kubernetes-shopify-infra/
├── backend/                          # Node.js Backend API
│   ├── src/
│   │   ├── index.ts                 # Main Express server with REST API
│   │   ├── types.ts                 # TypeScript interfaces and types
│   │   ├── audit.ts                 # Audit logging service
│   │   ├── quota.ts                 # Per-user quota management
│   │   ├── metrics.ts               # System metrics collector
│   │   ├── queue.ts                 # Provisioning queue manager
│   │   └── provisioner/
│   │       ├── woocommerce.ts       # WooCommerce provisioner (kubectl + Helm)
│   │       └── medusa.ts            # MedusaJS provisioner (stubbed)
│   ├── package.json
│   ├── tsconfig.json
│   └── nodemon.json                 # Dev auto-restart config
│
├── frontend/                         # React Dashboard
│   ├── src/
│   │   ├── App.tsx                  # Main dashboard component
│   │   ├── main.tsx                 # Entry point
│   │   ├── types.ts                 # Frontend TypeScript types
│   │   ├── components/
│   │   │   ├── layout/
│   │   │   │   └── DashboardLayout.tsx
│   │   │   ├── stores/
│   │   │   │   ├── DeploymentList.tsx    # Store list table
│   │   │   │   └── CreateStoreDrawer.tsx # Create store form
│   │   │   ├── overview/
│   │   │   │   ├── MetricsGrid.tsx       # Metrics cards
│   │   │   │   └── ActivityList.tsx      # Audit log timeline
│   │   │   └── ui/                       # Shadcn UI components
│   │   └── lib/
│   │       └── utils.ts
│   ├── package.json
│   └── vite.config.ts
│
├── charts/                           # Helm Charts
│   └── woocommerce/
│       ├── Chart.yaml               # Chart metadata + dependencies
│       ├── values.yaml              # Default values
│       ├── values-local.yaml        # Local development overrides
│       ├── values-prod.yaml         # Production VPS overrides
│       └── templates/
│           ├── configmap.yaml       # Setup script for WordPress/WooCommerce
│           ├── ingress.yaml         # External access configuration
│           ├── networkpolicy.yaml   # Network isolation rules
│           ├── resourcequota.yaml   # Per-store resource limits
│           └── limitrange.yaml      # Default pod resource limits
│
├── SYSTEM_DESIGN.md                  # Architecture & design decisions
├── README.md                         # This file - setup & usage
└── .gitignore
```

**Useful Commands:**
```bash
# List all stores (Kubernetes-level)
kubectl get namespaces -l app=urumi-store

# Get store status
curl http://localhost:3001/stores

# Check quota
curl http://localhost:3001/quota

# View metrics
curl http://localhost:3001/metrics

# Manual cleanup if needed
kubectl delete namespace <store-name> --force --grace-period=0
```

---

