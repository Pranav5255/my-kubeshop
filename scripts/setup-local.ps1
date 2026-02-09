# Urumi Store Provisioning - Local Setup (Windows PowerShell)

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Urumi Store Provisioning - Local Setup" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

# Refresh PATH to pick up newly installed tools
$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")

# Check prerequisites
Write-Host ""
Write-Host "Checking prerequisites..." -ForegroundColor Yellow

$missingTools = @()

# Check Docker
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    $missingTools += "docker"
}

# Check k3d (may be in AppData after winget install)
$k3dPath = Get-Command k3d -ErrorAction SilentlyContinue
if (-not $k3dPath) {
    $k3dPath = "$env:LOCALAPPDATA\Microsoft\WinGet\Links\k3d.exe"
    if (-not (Test-Path $k3dPath)) {
        $missingTools += "k3d"
    }
}

# Check helm
$helmPath = Get-Command helm -ErrorAction SilentlyContinue
if (-not $helmPath) {
    $helmPath = "$env:LOCALAPPDATA\Microsoft\WinGet\Links\helm.exe"
    if (-not (Test-Path $helmPath)) {
        $missingTools += "helm"
    }
}

# Check kubectl
$kubectlPath = Get-Command kubectl -ErrorAction SilentlyContinue
if (-not $kubectlPath) {
    $kubectlPath = "$env:LOCALAPPDATA\Microsoft\WinGet\Links\kubectl.exe"
    if (-not (Test-Path $kubectlPath)) {
        $missingTools += "kubectl"
    }
}

if ($missingTools.Count -gt 0) {
    Write-Host "❌ Missing tools: $($missingTools -join ', ')" -ForegroundColor Red
    Write-Host ""
    Write-Host "Install using winget:" -ForegroundColor Yellow
    if ($missingTools -contains "docker") {
        Write-Host "  winget install Docker.DockerDesktop" -ForegroundColor White
    }
    if ($missingTools -contains "k3d") {
        Write-Host "  winget install k3d.k3d" -ForegroundColor White
    }
    if ($missingTools -contains "helm") {
        Write-Host "  winget install Helm.Helm" -ForegroundColor White
    }
    if ($missingTools -contains "kubectl") {
        Write-Host "  winget install Kubernetes.kubectl" -ForegroundColor White
    }
    Write-Host ""
    Write-Host "After installation, restart PowerShell and run this script again." -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ All prerequisites found" -ForegroundColor Green

# Create k3d cluster
Write-Host ""
Write-Host "Creating k3d cluster..." -ForegroundColor Yellow

$clusterExists = k3d cluster list | Select-String "urumi"
if ($clusterExists) {
    Write-Host "⚠️  Cluster 'urumi' already exists, skipping creation" -ForegroundColor Yellow
} else {
    Write-Host "Starting Docker Desktop (if not running)..." -ForegroundColor Yellow
    Start-Sleep -Seconds 2
    
    k3d cluster create urumi --api-port 6550 -p "80:80@loadbalancer" -p "443:443@loadbalancer"
    Write-Host "✅ Cluster created" -ForegroundColor Green
}

# Wait for cluster to be ready
Write-Host ""
Write-Host "Waiting for cluster to be ready..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

# Verify cluster connection
Write-Host ""
Write-Host "Verifying cluster connection..." -ForegroundColor Yellow
$clusterInfo = kubectl cluster-info 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Connected to cluster" -ForegroundColor Green
} else {
    Write-Host "⚠️  Cluster may still be starting, waiting..." -ForegroundColor Yellow
    Start-Sleep -Seconds 10
}

# Install Ingress Controller
Write-Host ""
Write-Host "Installing Ingress Controller..." -ForegroundColor Yellow

$repoExists = helm repo list | Select-String "ingress-nginx"
if (-not $repoExists) {
    helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
    helm repo update
}

$ingressExists = kubectl get namespace ingress-nginx -ErrorAction SilentlyContinue
if ($ingressExists) {
    Write-Host "⚠️  Ingress controller already installed" -ForegroundColor Yellow
} else {
    helm install ingress-nginx ingress-nginx/ingress-nginx `
        --namespace ingress-nginx `
        --create-namespace `
        --set controller.service.type=LoadBalancer
    Write-Host "✅ Ingress controller installed" -ForegroundColor Green
}

# Wait for ingress controller
Write-Host ""
Write-Host "Waiting for ingress controller to be ready..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

# Setup backend
Write-Host ""
Write-Host "Setting up backend..." -ForegroundColor Yellow
Push-Location backend
if (-not (Test-Path "node_modules")) {
    npm install
}
Write-Host "✅ Backend dependencies installed" -ForegroundColor Green
Pop-Location

# Setup frontend
Write-Host ""
Write-Host "Setting up frontend..." -ForegroundColor Yellow
Push-Location frontend
if (-not (Test-Path "node_modules")) {
    npm install
}
Write-Host "✅ Frontend dependencies installed" -ForegroundColor Green
Pop-Location

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "✅ Local setup complete!" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Start backend: cd backend; npm run dev" -ForegroundColor White
Write-Host "2. Start frontend: cd frontend; npm run dev" -ForegroundColor White
Write-Host "3. Open dashboard: http://localhost:5173" -ForegroundColor White
Write-Host ""
Write-Host "To verify cluster:" -ForegroundColor Yellow
Write-Host "  kubectl get nodes" -ForegroundColor White
Write-Host "  kubectl get pods -n ingress-nginx" -ForegroundColor White
Write-Host ""
