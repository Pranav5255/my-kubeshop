# Urumi Store Provisioning Platform

A Kubernetes-native platform for provisioning e-commerce stores (WooCommerce, MedusaJS) on demand.

## Prerequisites

- **Kubernetes Cluster**: Kind, k3d, or Minikube (Local); k3s (Production).
- **Helm**: v3+.
- **Node.js**: v18+.
- **kubectl**: Configured to point to your cluster.

## Local Setup (Development)

1.  **Start Local Cluster (k3d example):**
    ```bash
    k3d cluster create urumi --api-port 6550 -p "80:80@loadbalancer"
    ```

2.  **Install Ingress Controller:**
    ```bash
    helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
    helm install ingress-nginx ingress-nginx/ingress-nginx --namespace ingress-nginx --create-namespace
    ```

3.  **Setup Backend:**
    ```bash
    cd personal/urumi/backend
    npm install
    npm run build
    npm start
    ```
    The backend runs on port `3001`.

4.  **Setup Frontend:**
    ```bash
    cd personal/urumi/frontend
    npm install
    npm run dev
    ```
    The dashboard runs on `http://localhost:5173`.

## Usage

1.  Open the Dashboard (`http://localhost:5173`).
2.  Click **"New Store"**.
3.  Enter a name (e.g., `my-store`) and select **WooCommerce**.
4.  Wait for the status to change from **Provisioning** to **Ready**.
5.  Click **"Open Store"**. The URL will be `http://my-store.store.127.0.0.1.nip.io`.

### Placing an Order (Definition of Done)

Each provisioned store comes pre-configured with:
- **5 Dummy Products**: Classic T-Shirt ($19.99), Coffee Mug ($12.99), Premium Notebook ($8.99), Warm Beanie ($15.99), Stainless Steel Water Bottle ($24.99)
- **2 Payment Methods**: Cash on Delivery (COD) and Dummy Payment Gateway

**Test Order Flow:**
1.  Navigate to the store URL (e.g., `http://my-store.store.127.0.0.1.nip.io`).
2.  Browse products and add one to cart (e.g., "Classic T-Shirt").
3.  Proceed to Checkout.
4.  Fill in billing details:
    - Name, Email, Address, City, Postcode, Phone
5.  Select payment method:
    - **Cash on Delivery**: For COD testing
    - **Dummy Payment Gateway**: For online payment testing (no real charges)
6.  Place Order.
7.  Verify order confirmation page appears.
8.  Check order in Admin Panel (`/wp-admin`) with credentials `user` / `password`:
    - Go to WooCommerce → Orders
    - Verify order details, products, and payment method

## Testing & Verification

### Quick Verification Checklist
See `VERIFICATION_CHECKLIST.md` for a complete step-by-step testing guide.

### Verify Store Cleanup
After deleting a store, verify all resources are cleaned up:
```bash
# Run cleanup verification script
./scripts/verify-cleanup.sh <store-name>

# Or manually check:
kubectl get namespace <store-name>  # Should return NotFound
kubectl get pvc -n <store-name>     # Should return NotFound
helm list -n <store-name>            # Should be empty
```

## Production Setup (VPS / k3s)

1.  **Provision VPS**: Ubuntu 22.04 (e.g., GCP e2-medium).
2.  **Install k3s**:
    ```bash
    curl -sfL https://get.k3s.io | sh -
    ```
3.  **Clone Repo**:
    ```bash
    git clone https://github.com/your-username/urumi.git
    cd urumi
    ```
4.  **Run Backend**:
    - Build Docker image or run directly with Node (ensure Helm/kubectl are installed).
    - Set environment variable `BASE_DOMAIN=<your-vps-ip>.nip.io`.
5.  **Helm Values**:
    - The backend automatically uses `values-prod.yaml` if `NODE_ENV=production`.
    - `values-prod.yaml` configures Ingress to use the proper domain and enables resource limits.

## System Design & Tradeoffs

### Architecture
- **Orchestrator**: Node.js wrapper around Helm CLI. Chosen for simplicity and direct leverage of Helm's lifecycle management.
- **Isolation**: Namespace-per-tenant. Provides strong isolation for resources and security.
- **Storage**: Dynamic PVC provisioning. Standard/Local-path storage classes used.
- **DNS**: `nip.io` for wildcard DNS without managing a real domain.

### Security
- **Network Policies**: Deny-all default. Allow Ingress and DB communication.
- **RBAC**: Backend service account has limited permissions (Namespace management).
- **Secrets**: Passwords generated/managed via Kubernetes Secrets (TODO: External Secret Store integration).

### Scalability
- **Horizontal**: The stateless backend can scale, but the bottleneck is K8s API/Helm execution.
- **Vertical**: Each store is isolated; cluster can scale by adding nodes.

