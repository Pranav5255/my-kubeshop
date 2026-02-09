#!/bin/bash
set -e

echo "=========================================="
echo "Urumi Store Provisioning - Production Setup (k3s)"
echo "=========================================="

# Configuration
VPS_IP="${1:-}"
if [ -z "$VPS_IP" ]; then
    echo "Usage: ./setup-prod.sh <VPS_IP>"
    echo "Example: ./setup-prod.sh 34.123.45.67"
    exit 1
fi

BASE_DOMAIN="${VPS_IP}"
echo "Using BASE_DOMAIN: $BASE_DOMAIN"

# Check prerequisites
echo ""
echo "Checking prerequisites..."

if ! command -v kubectl &> /dev/null; then
    echo "❌ kubectl not found. Install from: https://kubernetes.io/docs/tasks/tools/"
    exit 1
fi

if ! command -v helm &> /dev/null; then
    echo "❌ helm not found. Install from: https://helm.sh/"
    exit 1
fi

echo "✅ Prerequisites found"

# Configure kubectl to connect to VPS
echo ""
echo "Configuring kubectl..."
echo "Make sure you have copied the kubeconfig from the VPS:"
echo "  scp root@$VPS_IP:/etc/rancher/k3s/k3s.yaml ~/.kube/config-prod"
echo "  export KUBECONFIG=~/.kube/config-prod"
echo ""
read -p "Press enter when kubeconfig is configured..."

# Verify connection
echo ""
echo "Verifying cluster connection..."
if ! kubectl cluster-info &>/dev/null; then
    echo "❌ Cannot connect to cluster. Check kubeconfig."
    exit 1
fi
echo "✅ Connected to cluster"

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

# Build and push backend image (if using Docker)
echo ""
echo "Backend deployment options:"
echo "1. Run directly with Node.js (recommended for VPS)"
echo "2. Build Docker image and push to registry"
echo ""
read -p "Choose option (1 or 2): " DEPLOY_OPTION

if [ "$DEPLOY_OPTION" = "2" ]; then
    echo ""
    echo "Building Docker image..."
    REGISTRY="${2:-}"
    if [ -z "$REGISTRY" ]; then
        echo "Usage for Docker: ./setup-prod.sh <VPS_IP> <DOCKER_REGISTRY>"
        echo "Example: ./setup-prod.sh 34.123.45.67 gcr.io/my-project"
        exit 1
    fi
    
    docker build -t $REGISTRY/urumi-backend:latest backend/
    docker push $REGISTRY/urumi-backend:latest
    echo "✅ Image pushed to $REGISTRY"
fi

echo ""
echo "=========================================="
echo "✅ Production setup complete!"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. SSH into VPS: ssh root@$VPS_IP"
echo "2. Clone repo: git clone <repo-url>"
echo "3. Set environment: export BASE_DOMAIN=$BASE_DOMAIN"
echo "4. Start backend: cd backend && npm install && npm start"
echo "5. Access dashboard: http://$BASE_DOMAIN:5173"
echo ""
echo "For HTTPS (optional):"
echo "  Install cert-manager and configure Let's Encrypt"
echo "  Update values-prod.yaml with cert-manager annotations"
echo ""
