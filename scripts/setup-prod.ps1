# Urumi Store Provisioning - Production Setup (Windows PowerShell)

param(
    [string]$VpsIp = "",
    [string]$DockerRegistry = ""
)

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Urumi Store Provisioning - Production Setup (k3s)" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

# Configuration
if ([string]::IsNullOrEmpty($VpsIp)) {
    Write-Host ""
    Write-Host "Usage: .\setup-prod.ps1 -VpsIp <VPS_IP> [-DockerRegistry <REGISTRY>]" -ForegroundColor Yellow
    Write-Host "Example: .\setup-prod.ps1 -VpsIp 34.123.45.67" -ForegroundColor White
    Write-Host "Example with Docker: .\setup-prod.ps1 -VpsIp 34.123.45.67 -DockerRegistry gcr.io/my-project" -ForegroundColor White
    exit 1
}

$BaseDomain = $VpsIp
Write-Host "Using BASE_DOMAIN: $BaseDomain" -ForegroundColor Green

# Check prerequisites
Write-Host ""
Write-Host "Checking prerequisites..." -ForegroundColor Yellow

$missingTools = @()

if (-not (Get-Command kubectl -ErrorAction SilentlyContinue)) {
    $missingTools += "kubectl"
}

if (-not (Get-Command helm -ErrorAction SilentlyContinue)) {
    $missingTools += "helm"
}

if ($missingTools.Count -gt 0) {
    Write-Host "❌ Missing tools: $($missingTools -join ', ')" -ForegroundColor Red
    Write-Host "Install from:" -ForegroundColor Red
    Write-Host "  kubectl: https://kubernetes.io/docs/tasks/tools/" -ForegroundColor Red
    Write-Host "  helm: https://helm.sh/" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Prerequisites found" -ForegroundColor Green

# Configure kubectl to connect to VPS
Write-Host ""
Write-Host "Configuring kubectl..." -ForegroundColor Yellow
Write-Host "Make sure you have copied the kubeconfig from the VPS:" -ForegroundColor Yellow
Write-Host "  scp root@$VpsIp`:/etc/rancher/k3s/k3s.yaml `$env:USERPROFILE\.kube\config-prod" -ForegroundColor White
Write-Host "  `$env:KUBECONFIG = `"`$env:USERPROFILE\.kube\config-prod`"" -ForegroundColor White
Write-Host ""
Read-Host "Press enter when kubeconfig is configured"

# Verify connection
Write-Host ""
Write-Host "Verifying cluster connection..." -ForegroundColor Yellow
try {
    kubectl cluster-info | Out-Null
    Write-Host "✅ Connected to cluster" -ForegroundColor Green
} catch {
    Write-Host "❌ Cannot connect to cluster. Check kubeconfig." -ForegroundColor Red
    exit 1
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

# Build and push backend image (if using Docker)
Write-Host ""
Write-Host "Backend deployment options:" -ForegroundColor Yellow
Write-Host "1. Run directly with Node.js (recommended for VPS)" -ForegroundColor White
Write-Host "2. Build Docker image and push to registry" -ForegroundColor White
Write-Host ""
$deployOption = Read-Host "Choose option (1 or 2)"

if ($deployOption -eq "2") {
    if ([string]::IsNullOrEmpty($DockerRegistry)) {
        Write-Host ""
        Write-Host "Usage for Docker: .\setup-prod.ps1 -VpsIp <VPS_IP> -DockerRegistry <REGISTRY>" -ForegroundColor Yellow
        Write-Host "Example: .\setup-prod.ps1 -VpsIp 34.123.45.67 -DockerRegistry gcr.io/my-project" -ForegroundColor White
        exit 1
    }
    
    Write-Host ""
    Write-Host "Building Docker image..." -ForegroundColor Yellow
    docker build -t "$DockerRegistry/urumi-backend:latest" backend/
    docker push "$DockerRegistry/urumi-backend:latest"
    Write-Host "✅ Image pushed to $DockerRegistry" -ForegroundColor Green
}

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "✅ Production setup complete!" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. SSH into VPS: ssh root@$VpsIp" -ForegroundColor White
Write-Host "2. Clone repo: git clone <repo-url>" -ForegroundColor White
Write-Host "3. Set environment: `$env:BASE_DOMAIN = '$BaseDomain'" -ForegroundColor White
Write-Host "4. Start backend: cd backend; npm install; npm start" -ForegroundColor White
Write-Host "5. Access dashboard: http://$BaseDomain`:5173" -ForegroundColor White
Write-Host ""
Write-Host "For HTTPS (optional):" -ForegroundColor Yellow
Write-Host "  Install cert-manager and configure Let's Encrypt" -ForegroundColor White
Write-Host "  Update values-prod.yaml with cert-manager annotations" -ForegroundColor White
Write-Host ""
