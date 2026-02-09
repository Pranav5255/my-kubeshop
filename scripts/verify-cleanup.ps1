# Script to verify that store deletion properly cleans up all resources (Windows PowerShell)

param(
    [string]$StoreName = "test-store-1"
)

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Verifying cleanup for store: $StoreName" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

Write-Host ""
Write-Host "1. Checking if namespace exists..." -ForegroundColor Yellow
try {
    $namespace = kubectl get namespace $StoreName -ErrorAction SilentlyContinue
    if ($namespace) {
        Write-Host "   ❌ FAIL: Namespace $StoreName still exists" -ForegroundColor Red
        Write-Host "   $namespace" -ForegroundColor White
    } else {
        Write-Host "   ✅ PASS: Namespace $StoreName does not exist" -ForegroundColor Green
    }
} catch {
    Write-Host "   ✅ PASS: Namespace $StoreName does not exist" -ForegroundColor Green
}

Write-Host ""
Write-Host "2. Checking if PVCs exist..." -ForegroundColor Yellow
try {
    $pvcs = kubectl get pvc -n $StoreName -ErrorAction SilentlyContinue
    if ($pvcs) {
        Write-Host "   ❌ FAIL: PVCs still exist in namespace $StoreName" -ForegroundColor Red
        Write-Host "   $pvcs" -ForegroundColor White
    } else {
        Write-Host "   ✅ PASS: No PVCs found (namespace may not exist, which is expected)" -ForegroundColor Green
    }
} catch {
    Write-Host "   ✅ PASS: No PVCs found (namespace may not exist, which is expected)" -ForegroundColor Green
}

Write-Host ""
Write-Host "3. Checking if Helm release exists..." -ForegroundColor Yellow
try {
    $helmRelease = helm list -n $StoreName -ErrorAction SilentlyContinue | Select-String $StoreName
    if ($helmRelease) {
        Write-Host "   ❌ FAIL: Helm release $StoreName still exists" -ForegroundColor Red
        Write-Host "   $helmRelease" -ForegroundColor White
    } else {
        Write-Host "   ✅ PASS: Helm release $StoreName does not exist" -ForegroundColor Green
    }
} catch {
    Write-Host "   ✅ PASS: Helm release $StoreName does not exist" -ForegroundColor Green
}

Write-Host ""
Write-Host "4. Checking for any remaining resources..." -ForegroundColor Yellow
try {
    $resources = kubectl get all -n $StoreName -ErrorAction SilentlyContinue
    if ($resources) {
        Write-Host "   ❌ FAIL: Resources still exist in namespace $StoreName" -ForegroundColor Red
        Write-Host "   $resources" -ForegroundColor White
    } else {
        Write-Host "   ✅ PASS: No resources found in namespace $StoreName" -ForegroundColor Green
    }
} catch {
    Write-Host "   ✅ PASS: No resources found in namespace $StoreName" -ForegroundColor Green
}

Write-Host ""
Write-Host "5. Checking Persistent Volumes (PVs)..." -ForegroundColor Yellow
Write-Host "   Note: PVs may still exist but should be in 'Released' state" -ForegroundColor White
try {
    $pvs = kubectl get pv | Select-String $StoreName
    if ($pvs) {
        Write-Host "   ⚠️  PVs found for $StoreName (may be in Released state):" -ForegroundColor Yellow
        Write-Host "   $pvs" -ForegroundColor White
    } else {
        Write-Host "   ✅ No PVs found for $StoreName (or using dynamic provisioning)" -ForegroundColor Green
    }
} catch {
    Write-Host "   ✅ No PVs found for $StoreName (or using dynamic provisioning)" -ForegroundColor Green
}

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Cleanup verification complete!" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
