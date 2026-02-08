# Quick Test Guide - Step by Step Verification

## Prerequisites Check
```bash
# Verify cluster is running
kubectl cluster-info

# Verify ingress controller is installed
kubectl get pods -n ingress-nginx

# Verify backend is running (check terminal or)
curl http://localhost:3001/stores

# Verify frontend is accessible
curl http://localhost:5173
```

## Step 1: Create a Test Store

1. Open `http://localhost:5173` in your browser
2. Click **"New Store"**
3. Enter store name: `test-verify-1`
4. Select **WooCommerce**
5. Click **"Create Store"**
6. Wait 2-5 minutes for status to change to **"Ready"**

**Verify in terminal:**
```bash
# Check namespace
kubectl get namespace test-verify-1

# Check pods
kubectl get pods -n test-verify-1

# Check ingress
kubectl get ingress -n test-verify-1
```

## Step 2: Verify Store Access

1. Click **"Open Store"** in dashboard
2. Store should open at: `http://test-verify-1.store.127.0.0.1.nip.io`
3. Verify Storefront theme is active
4. Verify site loads without errors

## Step 3: Verify Products

1. On the storefront, verify you see products:
   - Classic T-Shirt ($19.99)
   - Coffee Mug ($12.99)
   - Premium Notebook ($8.99)
   - Warm Beanie ($15.99)
   - Stainless Steel Water Bottle ($24.99)

**Verify via CLI:**
```bash
# Get WordPress pod name
POD_NAME=$(kubectl get pods -n test-verify-1 -l app.kubernetes.io/name=wordpress -o jsonpath='{.items[0].metadata.name}')

# List products
kubectl exec -it $POD_NAME -n test-verify-1 -- wp wc product list --format=table --user=1
```

## Step 4: Verify Payment Gateways

1. Go to admin: `http://test-verify-1.store.127.0.0.1.nip.io/wp-admin`
2. Login: `user` / `password`
3. Navigate: **WooCommerce → Settings → Payments**
4. Verify both payment methods are enabled:
   - ✅ Cash on Delivery
   - ✅ Dummy Payment Gateway

**Verify via CLI:**
```bash
kubectl exec -it $POD_NAME -n test-verify-1 -- wp wc payment_gateway list --format=table --user=1
```

## Step 5: Test Order Flow - COD

1. Go to storefront
2. Click on **"Classic T-Shirt"**
3. Click **"Add to cart"**
4. Click **"View cart"** or cart icon
5. Click **"Proceed to checkout"**
6. Fill in billing details:
   - First Name: `Test`
   - Last Name: `User`
   - Email: `test@example.com`
   - Address: `123 Test Street`
   - City: `San Francisco`
   - Postcode: `94102`
   - Phone: `555-1234`
7. Select **"Cash on Delivery"** as payment method
8. Click **"Place Order"**
9. ✅ Verify order confirmation page appears
10. Note the order number

## Step 6: Verify Order in Admin

1. Go to admin: `http://test-verify-1.store.127.0.0.1.nip.io/wp-admin`
2. Navigate: **WooCommerce → Orders**
3. Find the order number from Step 5
4. Click on the order
5. Verify:
   - ✅ Order status is "Processing" or "Pending payment"
   - ✅ Product "Classic T-Shirt" is listed
   - ✅ Payment method shows "Cash on Delivery"
   - ✅ Billing address matches what you entered

**Verify via CLI:**
```bash
kubectl exec -it $POD_NAME -n test-verify-1 -- wp wc shop_order list --format=table --user=1
```

## Step 7: Test Order Flow - Dummy Payment

1. Go to storefront
2. Add **"Coffee Mug"** to cart
3. Proceed to checkout
4. Fill in billing details (can reuse same info)
5. Select **"Dummy Payment Gateway"** as payment method
6. Click **"Place Order"**
7. ✅ Verify order confirmation appears
8. ✅ Verify order appears in admin with "Dummy Payment Gateway"

## Step 8: Test Store Deletion & Cleanup

1. In dashboard, click delete icon (trash) on `test-verify-1`
2. Confirm deletion
3. Verify store disappears from dashboard

**Verify cleanup:**
```bash
# Run cleanup verification script
./scripts/verify-cleanup.sh test-verify-1

# Or manually verify:
kubectl get namespace test-verify-1
# Should return: Error from server (NotFound)

kubectl get pvc -n test-verify-1
# Should return: Error from server (NotFound)

helm list -n test-verify-1
# Should be empty
```

## Step 9: Test Multiple Stores

1. Create `test-verify-2` via dashboard
2. Create `test-verify-3` via dashboard
3. Verify all stores appear in dashboard
4. Verify each store has unique URL
5. Verify each store has its own products

**Verify isolation:**
```bash
# List all urumi stores
kubectl get namespaces -l app=urumi-store

# Verify each is in separate namespace
kubectl get pods --all-namespaces -l app.kubernetes.io/name=wordpress
```

## Success Criteria

✅ All steps complete without errors
✅ Products are visible and purchasable
✅ Payment gateways work
✅ Orders can be placed end-to-end
✅ Orders appear in admin
✅ Store deletion cleans up all resources
✅ Multiple stores can coexist

## Troubleshooting

### Products not showing?
```bash
# Check if products were created
kubectl exec -it $POD_NAME -n test-verify-1 -- wp wc product list

# Check WordPress/WooCommerce logs
kubectl logs $POD_NAME -n test-verify-1 | grep -i "product\|woocommerce"
```

### Payment gateways not showing?
```bash
# Check payment gateway settings
kubectl exec -it $POD_NAME -n test-verify-1 -- wp option get woocommerce_cod_settings
kubectl exec -it $POD_NAME -n test-verify-1 -- wp option get woocommerce_cheque_settings
```

### Store not accessible?
```bash
# Check ingress
kubectl get ingress -n test-verify-1
kubectl describe ingress -n test-verify-1

# Check pods are ready
kubectl get pods -n test-verify-1
```
