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
# See DEPLOYMENT_GUIDE.txt for detailed instructions
bash scripts/setup-prod.sh <VPS_IP>
```

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

## 📚 Documentation

- **SYSTEM_DESIGN.txt** - Architecture, isolation, provisioning flow, security
- **DEPLOYMENT_GUIDE.txt** - Local setup, production VPS, troubleshooting
- **API_REFERENCE.txt** - All endpoints with examples
- **QUICK_REFERENCE.txt** - Common commands and quick start
- **QUICK_TEST_GUIDE.md** - Step-by-step testing instructions
- **VERIFICATION_CHECKLIST.md** - Complete testing checklist

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

1. Open dashboard: http://localhost:5173
2. Click "New Store"
3. Enter store name (lowercase, alphanumeric, hyphens)
4. Select type (WooCommerce or MedusaJS)
5. Click "Create Store"
6. Wait 2-5 minutes for provisioning

### Access Store

Once status shows "Ready":
1. Click "Open Store"
2. Store URL: `http://<store-name>.store.<domain>.nip.io`
3. Browse products and place orders

### Place Order (Definition of Done)

1. Add product to cart
2. Proceed to checkout
3. Fill billing details
4. Select payment method (COD or Dummy)
5. Place order
6. Verify order in admin: `/wp-admin` (user/password)

### Delete Store

1. Click delete icon on store card
2. Confirm deletion
3. All resources automatically cleaned up

## 🔧 API Endpoints

### Store Management
- `GET /stores` - List all stores
- `POST /stores` - Create store
- `DELETE /stores/:name` - Delete store

### Monitoring
- `GET /stores/:name/events` - Kubernetes events
- `GET /stores/:name/activity` - Store activity log
- `GET /audit/logs` - Audit logs
- `GET /metrics` - System metrics
- `GET /queue` - Queue status
- `GET /quota` - User quota
- `GET /health` - Health check

See API_REFERENCE.txt for detailed documentation.

## 🚨 Troubleshooting

### Store not provisioning
```bash
kubectl get pods -n <store-name>
kubectl logs -n <store-name> -l app.kubernetes.io/name=wordpress
```

### Store URL not accessible
```bash
kubectl get ingress -n <store-name>
nslookup <store-name>.store.127.0.0.1.nip.io
```

### Products not showing
```bash
kubectl exec -it <pod> -n <store-name> -- wp wc product list
```

See DEPLOYMENT_GUIDE.txt for comprehensive troubleshooting.

## 📦 Project Structure

```
urumi/
├── backend/                    # Node.js backend
│   ├── src/
│   │   ├── index.ts           # Main API server
│   │   ├── types.ts           # TypeScript interfaces
│   │   ├── audit.ts           # Audit logging
│   │   ├── quota.ts           # Quota management
│   │   ├── metrics.ts         # Metrics collection
│   │   ├── queue.ts           # Concurrency queue
│   │   └── provisioner/       # Store provisioners
│   ├── package.json
│   └── tsconfig.json
├── frontend/                   # React dashboard
│   ├── src/
│   │   ├── App.tsx            # Main dashboard
│   │   ├── index.css          # Styling
│   │   └── main.tsx           # Entry point
│   ├── package.json
│   └── vite.config.ts
├── charts/                     # Helm charts
│   └── woocommerce/
│       ├── Chart.yaml
│       ├── values.yaml
│       ├── values-local.yaml
│       ├── values-prod.yaml
│       └── templates/
├── scripts/                    # Utility scripts
│   ├── setup-local.sh
│   ├── setup-prod.sh
│   ├── test-e2e.sh
│   └── verify-cleanup.sh
└── README.md
```

## 🎓 Learning Outcomes

This project demonstrates:
- **Kubernetes orchestration** - Namespaces, Ingress, NetworkPolicies, ResourceQuotas
- **Helm templating** - Dynamic values, dependencies, hooks
- **Multi-tenant architecture** - Isolation, quotas, fair resource allocation
- **Observability** - Audit logging, metrics, activity tracking
- **Scalability** - Concurrency control, horizontal scaling, queue management
- **Security** - RBAC, network policies, secrets management
- **DevOps practices** - Infrastructure as code, automated deployment, monitoring

## 📝 License

This project is part of the Urumi AI SDE internship assessment.

## 🤝 Support

For issues or questions:
1. Check DEPLOYMENT_GUIDE.txt troubleshooting section
2. Review API_REFERENCE.txt for endpoint details
3. Check backend logs: `npm run dev 2>&1 | tee backend.log`
4. Check Kubernetes resources: `kubectl get all -n <store-name>`

---

**Ready to deploy? Start with `bash scripts/setup-local.sh` or see DEPLOYMENT_GUIDE.txt for production setup.**

