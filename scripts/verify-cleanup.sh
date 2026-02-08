#!/bin/bash
# Script to verify that store deletion properly cleans up all resources

STORE_NAME="${1:-test-store-1}"

echo "=========================================="
echo "Verifying cleanup for store: $STORE_NAME"
echo "=========================================="

echo ""
echo "1. Checking if namespace exists..."
if kubectl get namespace "$STORE_NAME" &>/dev/null; then
    echo "   ❌ FAIL: Namespace $STORE_NAME still exists"
    kubectl get namespace "$STORE_NAME"
else
    echo "   ✅ PASS: Namespace $STORE_NAME does not exist"
fi

echo ""
echo "2. Checking if PVCs exist..."
PVC_COUNT=$(kubectl get pvc -n "$STORE_NAME" 2>/dev/null | wc -l)
if [ "$PVC_COUNT" -gt 0 ]; then
    echo "   ❌ FAIL: PVCs still exist in namespace $STORE_NAME"
    kubectl get pvc -n "$STORE_NAME"
else
    echo "   ✅ PASS: No PVCs found (namespace may not exist, which is expected)"
fi

echo ""
echo "3. Checking if Helm release exists..."
if helm list -n "$STORE_NAME" 2>/dev/null | grep -q "$STORE_NAME"; then
    echo "   ❌ FAIL: Helm release $STORE_NAME still exists"
    helm list -n "$STORE_NAME"
else
    echo "   ✅ PASS: Helm release $STORE_NAME does not exist"
fi

echo ""
echo "4. Checking for any remaining resources..."
RESOURCE_COUNT=$(kubectl get all -n "$STORE_NAME" 2>/dev/null | wc -l)
if [ "$RESOURCE_COUNT" -gt 0 ]; then
    echo "   ❌ FAIL: Resources still exist in namespace $STORE_NAME"
    kubectl get all -n "$STORE_NAME"
else
    echo "   ✅ PASS: No resources found in namespace $STORE_NAME"
fi

echo ""
echo "5. Checking Persistent Volumes (PVs)..."
echo "   Note: PVs may still exist but should be in 'Released' state"
kubectl get pv | grep "$STORE_NAME" || echo "   ✅ No PVs found for $STORE_NAME (or using dynamic provisioning)"

echo ""
echo "=========================================="
echo "Cleanup verification complete!"
echo "=========================================="
