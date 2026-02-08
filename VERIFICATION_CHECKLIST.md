# Urumi Store Provisioning - Verification Checklist

## Prerequisites
- [ ] Local Kubernetes cluster running (k3d/kind/minikube)
- [ ] Ingress Controller installed
- [ ] Backend server running (`npm run dev` in `backend/`)
- [ ] Frontend dashboard running (`npm run dev` in `frontend/`)

## Phase 1: Store Provisioning

### Test 1: Create a New Store
- [ ] Open dashboard at `http://localhost:5173`
- [ ] Click "New Store" button
- [ ] Enter store name (e.g., `test-store-1`)
- [ ] Select "WooCommerce" type
- [ ] Click "Create Store"
- [ ] Verify status shows "Provisioning" initially
- [ ] Wait for status to change to "Ready" (should take 2-5 minutes)

**Verification Commands:**
```bash
# Check namespace was created
kubectl get namespace test-store-1

# Check pods are running
kubectl get pods -n test-store-1

# Check ingress exists
kubectl get ingress -n test-store-1
```

### Test 2: Verify Store URL Access
- [ ] Click "Open Store" link in dashboard
- [ ] Verify storefront loads at `http://test-store-1.store.127.0.0.1.nip.io`
- [ ] Verify Storefront theme is active
- [ ] Verify site title shows "Urumi Store test-store-1"

## Phase 2: Store Functionality

### Test 3: Verify Dummy Products
- [ ] Navigate to storefront
- [ ] Verify at least 5 products are visible:
  - [ ] Classic T-Shirt ($19.99)
  - [ ] Coffee Mug ($12.99)
  - [ ] Premium Notebook ($8.99)
  - [ ] Warm Beanie ($15.99)
  - [ ] Stainless Steel Water Bottle ($24.99)
- [ ] Click on a product to view details
- [ ] Verify product description, price, and stock status are visible

**Verification Commands:**
```bash
# Check products via wp-cli
kubectl exec -it <wordpress-pod-name> -n test-store-1 -- wp wc product list --format=table --user=1
```

### Test 4: Verify Payment Gateways
- [ ] Navigate to WooCommerce admin: `http://test-store-1.store.127.0.0.1.nip.io/wp-admin`
- [ ] Login with credentials: `user` / `password`
- [ ] Go to: WooCommerce → Settings → Payments
- [ ] Verify payment methods are enabled:
  - [ ] Cash on Delivery (COD)
  - [ ] Dummy Payment Gateway (or Cheque renamed)

**Verification Commands:**
```bash
# Check payment gateways via wp-cli
kubectl exec -it <wordpress-pod-name> -n test-store-1 -- wp wc payment_gateway list --format=table --user=1
```

## Phase 3: End-to-End Order Flow

### Test 5: Place Order with COD
- [ ] Go to storefront
- [ ] Add "Classic T-Shirt" to cart
- [ ] Click "View Cart" or cart icon
- [ ] Verify product appears in cart with correct price
- [ ] Click "Proceed to Checkout"
- [ ] Fill in billing details:
  - First Name: Test
  - Last Name: User
  - Email: test@example.com
  - Address: 123 Test St
  - City: San Francisco
  - Postcode: 94102
  - Phone: 555-1234
- [ ] Select "Cash on Delivery" as payment method
- [ ] Click "Place Order"
- [ ] Verify order confirmation page appears
- [ ] Note the order number

### Test 6: Verify Order in Admin
- [ ] Go to WooCommerce admin: `http://test-store-1.store.127.0.0.1.nip.io/wp-admin`
- [ ] Navigate to: WooCommerce → Orders
- [ ] Find the order number from Test 5
- [ ] Verify order details:
  - [ ] Order status is "Processing" or "Pending payment"
  - [ ] Product "Classic T-Shirt" is listed
  - [ ] Payment method shows "Cash on Delivery"
  - [ ] Billing address matches what was entered

**Verification Commands:**
```bash
# List orders via wp-cli
kubectl exec -it <wordpress-pod-name> -n test-store-1 -- wp wc shop_order list --format=table --user=1
```

### Test 7: Place Order with Dummy Payment
- [ ] Go to storefront
- [ ] Add "Coffee Mug" to cart
- [ ] Proceed to checkout
- [ ] Fill in billing details (can reuse same info)
- [ ] Select "Dummy Payment Gateway" as payment method
- [ ] Click "Place Order"
- [ ] Verify order confirmation page appears
- [ ] Verify order appears in admin with "Dummy Payment Gateway" as payment method

## Phase 4: Resource Cleanup Verification

### Test 8: Delete Store and Verify Cleanup
- [ ] In dashboard, click delete icon (trash) on `test-store-1`
- [ ] Confirm deletion
- [ ] Verify store disappears from dashboard

**Verification Commands:**
```bash
# Check namespace is deleted
kubectl get namespace test-store-1
# Should return: Error from server (NotFound)

# Check PVCs are deleted
kubectl get pvc -n test-store-1
# Should return: Error from server (NotFound)

# Check Helm release is gone
helm list -n test-store-1
# Should return empty or error

# Verify all resources are cleaned up
kubectl get all -n test-store-1
# Should return: Error from server (NotFound)
```

### Test 9: Verify Persistent Volumes Are Released
```bash
# List all PVCs in cluster
kubectl get pvc --all-namespaces

# List all PVs
kubectl get pv

# Verify no orphaned PVs exist for deleted store
# (PVs should be automatically cleaned up if using dynamic provisioning)
```

## Phase 5: Multi-Store Isolation

### Test 10: Create Multiple Stores
- [ ] Create `test-store-2` via dashboard
- [ ] Create `test-store-3` via dashboard
- [ ] Verify all stores appear in dashboard
- [ ] Verify each store has unique URL

**Verification Commands:**
```bash
# List all namespaces with urumi-store label
kubectl get namespaces -l app=urumi-store

# Verify each store is in its own namespace
kubectl get pods --all-namespaces -l app.kubernetes.io/name=wordpress
```

### Test 11: Verify Network Isolation
```bash
# Check NetworkPolicies exist for each store
kubectl get networkpolicy -n test-store-2
kubectl get networkpolicy -n test-store-3

# Verify ResourceQuotas exist
kubectl get resourcequota -n test-store-2
kubectl get resourcequota -n test-store-3

# Verify LimitRanges exist
kubectl get limitrange -n test-store-2
kubectl get limitrange -n test-store-3
```

## Phase 6: Error Handling

### Test 12: Test Invalid Store Name
- [ ] Try to create store with invalid name (e.g., `test_store` with underscore)
- [ ] Verify error message appears
- [ ] Try to create store with uppercase letters
- [ ] Verify error message appears

### Test 13: Test Duplicate Store Name
- [ ] Create store `test-duplicate`
- [ ] Try to create another store with same name
- [ ] Verify appropriate error handling

## Success Criteria

All tests should pass for the system to be considered fully functional:
- ✅ Stores can be provisioned successfully
- ✅ Stores are accessible via nip.io URLs
- ✅ Dummy products are available in storefront
- ✅ Payment gateways (COD + Dummy) are configured
- ✅ Orders can be placed end-to-end
- ✅ Orders appear in WooCommerce admin
- ✅ Store deletion cleans up all resources (namespace, PVCs, Helm release)
- ✅ Multiple stores can coexist in isolation
- ✅ Network policies and resource quotas are enforced
