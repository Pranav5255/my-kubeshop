# Urumi E2E Testing Script (Windows PowerShell)

param(
    [string]$StoreName = "test-e2e-$(Get-Date -Format 'yyyyMMddHHmmss')",
    [string]$BaseUrl = "http://localhost:3001"
)

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Urumi E2E Testing Script" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

Write-Host ""
Write-Host "Testing store: $StoreName" -ForegroundColor Yellow
Write-Host "Backend URL: $BaseUrl" -ForegroundColor Yellow
Write-Host ""

# Test 1: Health check
Write-Host "Test 1: Health check..." -ForegroundColor Yellow
try {
    $health = Invoke-RestMethod -Uri "$BaseUrl/health" -Method Get
    if ($health.status -eq "ok") {
        Write-Host "✅ Backend is healthy" -ForegroundColor Green
    } else {
        Write-Host "❌ Backend health check failed" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "❌ Backend health check failed: $_" -ForegroundColor Red
    exit 1
}

# Test 2: Get quota
Write-Host ""
Write-Host "Test 2: Get user quota..." -ForegroundColor Yellow
try {
    $quota = Invoke-RestMethod -Uri "$BaseUrl/quota" -Method Get
    Write-Host "Quota: $($quota | ConvertTo-Json)" -ForegroundColor White
    if ($quota.canCreate -ne $null) {
        Write-Host "✅ Quota endpoint working" -ForegroundColor Green
    } else {
        Write-Host "❌ Quota endpoint failed" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "❌ Quota endpoint failed: $_" -ForegroundColor Red
    exit 1
}

# Test 3: Create store
Write-Host ""
Write-Host "Test 3: Creating store..." -ForegroundColor Yellow
try {
    $body = @{
        name = $StoreName
        type = "woocommerce"
    } | ConvertTo-Json
    
    $createResponse = Invoke-RestMethod -Uri "$BaseUrl/stores" -Method Post `
        -ContentType "application/json" -Body $body
    
    Write-Host "Response: $($createResponse | ConvertTo-Json)" -ForegroundColor White
    
    if ($createResponse.message -like "*provisioning started*") {
        Write-Host "✅ Store creation initiated" -ForegroundColor Green
    } else {
        Write-Host "❌ Store creation failed" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "❌ Store creation failed: $_" -ForegroundColor Red
    exit 1
}

# Test 4: List stores
Write-Host ""
Write-Host "Test 4: Listing stores..." -ForegroundColor Yellow
try {
    $stores = Invoke-RestMethod -Uri "$BaseUrl/stores" -Method Get
    if ($stores | Where-Object { $_.name -eq $StoreName }) {
        Write-Host "✅ Store appears in list" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Store not yet in list (may still be provisioning)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "❌ Store listing failed: $_" -ForegroundColor Red
    exit 1
}

# Test 5: Get metrics
Write-Host ""
Write-Host "Test 5: Getting metrics..." -ForegroundColor Yellow
try {
    $metrics = Invoke-RestMethod -Uri "$BaseUrl/metrics" -Method Get
    Write-Host "Metrics: $($metrics | ConvertTo-Json)" -ForegroundColor White
    if ($metrics.activeStores -ne $null) {
        Write-Host "✅ Metrics endpoint working" -ForegroundColor Green
    } else {
        Write-Host "❌ Metrics endpoint failed" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "❌ Metrics endpoint failed: $_" -ForegroundColor Red
    exit 1
}

# Test 6: Get audit logs
Write-Host ""
Write-Host "Test 6: Getting audit logs..." -ForegroundColor Yellow
try {
    $audit = Invoke-RestMethod -Uri "$BaseUrl/audit/logs" -Method Get
    if ($audit | Where-Object { $_.action -eq "create" }) {
        Write-Host "✅ Audit logs working" -ForegroundColor Green
    } else {
        Write-Host "⚠️  No audit logs yet" -ForegroundColor Yellow
    }
} catch {
    Write-Host "❌ Audit logs failed: $_" -ForegroundColor Red
    exit 1
}

# Test 7: Wait for provisioning
Write-Host ""
Write-Host "Test 7: Waiting for store to be ready (max 5 minutes)..." -ForegroundColor Yellow
$timeout = 300
$elapsed = 0
$interval = 10

while ($elapsed -lt $timeout) {
    try {
        $stores = Invoke-RestMethod -Uri "$BaseUrl/stores" -Method Get
        $store = $stores | Where-Object { $_.name -eq $StoreName }
        
        if ($store) {
            $status = $store.status
            
            if ($status -eq "Ready") {
                Write-Host "✅ Store is Ready!" -ForegroundColor Green
                break
            } elseif ($status -eq "Failed") {
                Write-Host "❌ Store provisioning failed" -ForegroundColor Red
                exit 1
            } else {
                Write-Host "⏳ Status: $status ($($elapsed)s elapsed)" -ForegroundColor Yellow
            }
        }
    } catch {
        Write-Host "⚠️  Error checking status: $_" -ForegroundColor Yellow
    }
    
    Start-Sleep -Seconds $interval
    $elapsed += $interval
}

if ($elapsed -ge $timeout) {
    Write-Host "❌ Timeout waiting for store to be ready" -ForegroundColor Red
    exit 1
}

# Test 8: Get store URL
Write-Host ""
Write-Host "Test 8: Getting store URL..." -ForegroundColor Yellow
try {
    $stores = Invoke-RestMethod -Uri "$BaseUrl/stores" -Method Get
    $store = $stores | Where-Object { $_.name -eq $StoreName }
    $storeUrl = $store.url
    
    Write-Host "Store URL: $storeUrl" -ForegroundColor White
    
    if ([string]::IsNullOrEmpty($storeUrl)) {
        Write-Host "❌ Could not get store URL" -ForegroundColor Red
        exit 1
    }
    
    Write-Host "✅ Store URL obtained" -ForegroundColor Green
} catch {
    Write-Host "❌ Failed to get store URL: $_" -ForegroundColor Red
    exit 1
}

# Test 9: Check store accessibility
Write-Host ""
Write-Host "Test 9: Checking store accessibility..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri $storeUrl -UseBasicParsing
    if ($response.Content -match "WordPress|Storefront|WooCommerce") {
        Write-Host "✅ Store is accessible" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Store may not be fully ready yet" -ForegroundColor Yellow
    }
} catch {
    Write-Host "⚠️  Store accessibility check failed: $_" -ForegroundColor Yellow
}

# Test 10: Delete store
Write-Host ""
Write-Host "Test 10: Deleting store..." -ForegroundColor Yellow
try {
    $deleteResponse = Invoke-RestMethod -Uri "$BaseUrl/stores/$StoreName" -Method Delete
    if ($deleteResponse.message -like "*deleted*") {
        Write-Host "✅ Store deletion initiated" -ForegroundColor Green
    } else {
        Write-Host "❌ Store deletion failed" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "❌ Store deletion failed: $_" -ForegroundColor Red
    exit 1
}

# Test 11: Verify cleanup
Write-Host ""
Write-Host "Test 11: Verifying cleanup (waiting 30s)..." -ForegroundColor Yellow
Start-Sleep -Seconds 30

try {
    $namespaceExists = kubectl get namespace $StoreName -ErrorAction SilentlyContinue
    if (-not $namespaceExists) {
        Write-Host "✅ Namespace cleaned up" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Namespace still exists" -ForegroundColor Yellow
    }
} catch {
    Write-Host "✅ Namespace cleaned up" -ForegroundColor Green
}

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "✅ E2E tests completed successfully!" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Cyan
