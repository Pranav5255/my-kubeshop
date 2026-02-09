#!/bin/bash
set -e

echo "=========================================="
echo "Urumi Store Provisioning - Local Setup"
echo "=========================================="

# Check prerequisites
echo ""
echo "Checking prerequisites..."

if ! command -v k3d &> /dev/null; then
    echo "❌ k3d not found. Install from: https://k3d.io/"
    exit 1
fi

if ! command -v helm &> /dev/null; then
    echo "❌ helm not found. Install from: https://helm.sh/"
    exit 1
fi

if ! command -v kubectl &> /dev/null; then
    echo "❌ kubectl not found. Install from: https://kubernetes.io/docs/tasks/tools/"
    exit 1
fi

echo "✅ All prerequisites found"

# Create k3d cluster
echo ""
echo "Creating k3d cluster..."
if k3d cluster list | grep -q "urumi"; then
    echo "⚠️  Cluster 'urumi' already exists, skipping creation"
else
    k3d cluster create urumi --api-port 6550 -p "80:80@loadbalancer" -p "443:443@loadbalancer"
    echo "✅ Cluster created"
fi

# Wait for cluster to be ready
echo ""
echo "Waiting for cluster to be ready..."
kubectl wait --for=condition=Ready node --all --timeout=300s 2>/dev/null || true
sleep 5

# Install Ingress Controller
echo ""
echo "Installing Ingress Controller..."
if helm repo list | grep -q "ingress-nginx"; then
    echo "⚠️  Repo already added"
else
    helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
    helm repo update
fi

if kubectl get namespace ingress-nginx &>/dev/null; then
    echo "⚠️  Ingress controller already installed"
else
    helm install ingress-nginx ingress-nginx/ingress-nginx \
        --namespace ingress-nginx \
        --create-namespace \
        --set controller.service.type=LoadBalancer
    echo "✅ Ingress controller installed"
fi

# Wait for ingress controller
echo ""
echo "Waiting for ingress controller to be ready..."
kubectl wait --for=condition=Ready pod -l app.kubernetes.io/name=ingress-nginx -n ingress-nginx --timeout=300s 2>/dev/null || true

# Setup backend
echo ""
echo "Setting up backend..."
cd backend
if [ ! -d "node_modules" ]; then
    npm install
fi
echo "✅ Backend dependencies installed"

# Setup frontend
echo ""
echo "Setting up frontend..."
cd ../frontend
if [ ! -d "node_modules" ]; then
    npm install
fi
echo "✅ Frontend dependencies installed"

cd ..

echo ""
echo "=========================================="
echo "✅ Local setup complete!"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Start backend: cd backend && npm run dev"
echo "2. Start frontend: cd frontend && npm run dev"
echo "3. Open dashboard: http://localhost:5173"
echo ""
echo "To verify cluster:"
echo "  kubectl get nodes"
echo "  kubectl get pods -n ingress-nginx"
echo ""
