#!/bin/bash
set -e

echo "=========================================="
echo "Urumi E2E Testing Script"
echo "=========================================="

STORE_NAME="${1:-test-e2e-$(date +%s)}"
BASE_URL="http://localhost:3001"

echo ""
echo "Testing store: $STORE_NAME"
echo "Backend URL: $BASE_URL"
echo ""

# Test 1: Health check
echo "Test 1: Health check..."
HEALTH=$(curl -s $BASE_URL/health)
if echo "$HEALTH" | grep -q "ok"; then
    echo "✅ Backend is healthy"
else
    echo "❌ Backend health check failed"
    exit 1
fi

# Test 2: Get quota
echo ""
echo "Test 2: Get user quota..."
QUOTA=$(curl -s $BASE_URL/quota)
echo "Quota: $QUOTA"
if echo "$QUOTA" | grep -q "canCreate"; then
    echo "✅ Quota endpoint working"
else
    echo "❌ Quota endpoint failed"
    exit 1
fi

# Test 3: Create store
echo ""
echo "Test 3: Creating store..."
CREATE_RESPONSE=$(curl -s -X POST $BASE_URL/stores \
    -H "Content-Type: application/json" \
    -d "{\"name\":\"$STORE_NAME\",\"type\":\"woocommerce\"}")

echo "Response: $CREATE_RESPONSE"

if echo "$CREATE_RESPONSE" | grep -q "provisioning started"; then
    echo "✅ Store creation initiated"
else
    echo "❌ Store creation failed"
    exit 1
fi

# Test 4: List stores
echo ""
echo "Test 4: Listing stores..."
STORES=$(curl -s $BASE_URL/stores)
if echo "$STORES" | grep -q "$STORE_NAME"; then
    echo "✅ Store appears in list"
else
    echo "⚠️  Store not yet in list (may still be provisioning)"
fi

# Test 5: Get metrics
echo ""
echo "Test 5: Getting metrics..."
METRICS=$(curl -s $BASE_URL/metrics)
echo "Metrics: $METRICS"
if echo "$METRICS" | grep -q "activeStores"; then
    echo "✅ Metrics endpoint working"
else
    echo "❌ Metrics endpoint failed"
    exit 1
fi

# Test 6: Get audit logs
echo ""
echo "Test 6: Getting audit logs..."
AUDIT=$(curl -s $BASE_URL/audit/logs)
if echo "$AUDIT" | grep -q "create"; then
    echo "✅ Audit logs working"
else
    echo "⚠️  No audit logs yet"
fi

# Test 7: Wait for provisioning
echo ""
echo "Test 7: Waiting for store to be ready (max 5 minutes)..."
TIMEOUT=300
ELAPSED=0
while [ $ELAPSED -lt $TIMEOUT ]; do
    STATUS=$(curl -s $BASE_URL/stores | grep -o "\"name\":\"$STORE_NAME\"[^}]*\"status\":\"[^\"]*\"" | grep -o "\"status\":\"[^\"]*\"" | cut -d'"' -f4)
    
    if [ "$STATUS" = "Ready" ]; then
        echo "✅ Store is Ready!"
        break
    elif [ "$STATUS" = "Failed" ]; then
        echo "❌ Store provisioning failed"
        exit 1
    else
        echo "⏳ Status: $STATUS (${ELAPSED}s elapsed)"
        sleep 10
        ELAPSED=$((ELAPSED + 10))
    fi
done

if [ $ELAPSED -ge $TIMEOUT ]; then
    echo "❌ Timeout waiting for store to be ready"
    exit 1
fi

# Test 8: Get store URL
echo ""
echo "Test 8: Getting store URL..."
STORE_URL=$(curl -s $BASE_URL/stores | grep -o "\"name\":\"$STORE_NAME\"[^}]*\"url\":\"[^\"]*\"" | grep -o "\"url\":\"[^\"]*\"" | cut -d'"' -f4)
echo "Store URL: $STORE_URL"

if [ -z "$STORE_URL" ]; then
    echo "❌ Could not get store URL"
    exit 1
fi

echo "✅ Store URL obtained"

# Test 9: Check store accessibility
echo ""
echo "Test 9: Checking store accessibility..."
if curl -s "$STORE_URL" | grep -q "WordPress\|Storefront\|WooCommerce"; then
    echo "✅ Store is accessible"
else
    echo "⚠️  Store may not be fully ready yet"
fi

# Test 10: Delete store
echo ""
echo "Test 10: Deleting store..."
DELETE_RESPONSE=$(curl -s -X DELETE $BASE_URL/stores/$STORE_NAME)
if echo "$DELETE_RESPONSE" | grep -q "deleted"; then
    echo "✅ Store deletion initiated"
else
    echo "❌ Store deletion failed"
    exit 1
fi

# Test 11: Verify cleanup
echo ""
echo "Test 11: Verifying cleanup (waiting 30s)..."
sleep 30

NAMESPACE_EXISTS=$(kubectl get namespace $STORE_NAME 2>/dev/null || echo "NotFound")
if [ "$NAMESPACE_EXISTS" = "NotFound" ]; then
    echo "✅ Namespace cleaned up"
else
    echo "⚠️  Namespace still exists"
fi

echo ""
echo "=========================================="
echo "✅ E2E tests completed successfully!"
echo "=========================================="
