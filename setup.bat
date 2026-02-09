@echo off
REM Urumi Store Provisioning - Setup Script for Windows
REM This script will install all required tools and set up the local environment

setlocal enabledelayedexpansion

echo.
echo ==========================================
echo Urumi Store Provisioning - Setup
echo ==========================================
echo.

REM Check if running as admin
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo [WARNING] This script should be run as Administrator for best results
    echo Continuing anyway...
    echo.
)

REM Check for required tools and install if missing
echo Checking prerequisites...
echo.

REM Check Docker
where docker >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Docker Desktop not found
    echo Please install from: https://www.docker.com/products/docker-desktop
    echo.
    pause
    exit /b 1
)
echo [OK] Docker found

REM Check if k3d needs to be installed
where k3d >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [INFO] k3d not in PATH, installing via winget...
    winget install k3d.k3d --silent
    if !ERRORLEVEL! NEQ 0 (
        echo [ERROR] Failed to install k3d
        echo Please install manually: winget install k3d.k3d
        pause
        exit /b 1
    )
)
echo [OK] k3d available

REM Check if helm needs to be installed
where helm >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [INFO] helm not in PATH, installing via winget...
    winget install Helm.Helm --silent
    if !ERRORLEVEL! NEQ 0 (
        echo [ERROR] Failed to install helm
        echo Please install manually: winget install Helm.Helm
        pause
        exit /b 1
    )
)
echo [OK] helm available

REM Check if kubectl needs to be installed
where kubectl >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [INFO] kubectl not in PATH, installing via winget...
    winget install Kubernetes.kubectl --silent
    if !ERRORLEVEL! NEQ 0 (
        echo [ERROR] Failed to install kubectl
        echo Please install manually: winget install Kubernetes.kubectl
        pause
        exit /b 1
    )
)
echo [OK] kubectl available

echo.
echo All prerequisites found!
echo.

REM Refresh PATH from registry
for /f "tokens=2*" %%A in ('reg query HKCU\Environment /v PATH') do set "USERPATH=%%B"
for /f "tokens=2*" %%A in ('reg query "HKLM\SYSTEM\CurrentControlSet\Control\Session Manager\Environment" /v PATH') do set "SYSPATH=%%B"
set "PATH=%USERPATH%;%SYSPATH%;%PATH%"

echo Creating k3d cluster...
k3d cluster create urumi --api-port 6550 -p "80:80@loadbalancer" -p "443:443@loadbalancer" 2>nul
if %ERRORLEVEL% EQU 0 (
    echo [OK] Cluster created
) else (
    echo [INFO] Cluster may already exist, checking...
    k3d cluster list | find "urumi" >nul
    if %ERRORLEVEL% EQU 0 (
        echo [OK] Cluster 'urumi' already exists
    ) else (
        echo [ERROR] Failed to create cluster
        pause
        exit /b 1
    )
)

echo.
echo Waiting for cluster to be ready...
timeout /t 15 /nobreak

echo.
echo Verifying cluster connection...
kubectl cluster-info >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Cannot connect to cluster
    echo Please ensure Docker Desktop is running
    pause
    exit /b 1
)
echo [OK] Connected to cluster

echo.
echo Installing Ingress Controller...
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx >nul 2>nul
helm repo update >nul 2>nul

REM Check if ingress-nginx namespace exists
kubectl get namespace ingress-nginx >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    echo [INFO] Ingress controller already installed
) else (
    helm install ingress-nginx ingress-nginx/ingress-nginx ^
        --namespace ingress-nginx ^
        --create-namespace ^
        --set controller.service.type=LoadBalancer >nul 2>nul
    if %ERRORLEVEL% EQU 0 (
        echo [OK] Ingress controller installed
    ) else (
        echo [ERROR] Failed to install ingress controller
        pause
        exit /b 1
    )
)

echo.
echo Waiting for ingress controller to be ready...
timeout /t 10 /nobreak

echo.
echo Setting up backend...
cd backend
if not exist "node_modules" (
    echo Installing backend dependencies...
    call npm install
    if %ERRORLEVEL% NEQ 0 (
        echo [ERROR] Failed to install backend dependencies
        pause
        exit /b 1
    )
)
cd ..
echo [OK] Backend dependencies installed

echo.
echo Setting up frontend...
cd frontend
if not exist "node_modules" (
    echo Installing frontend dependencies...
    call npm install
    if %ERRORLEVEL% NEQ 0 (
        echo [ERROR] Failed to install frontend dependencies
        pause
        exit /b 1
    )
)
cd ..
echo [OK] Frontend dependencies installed

echo.
echo ==========================================
echo Setup complete!
echo ==========================================
echo.
echo Next steps:
echo.
echo 1. Open PowerShell Terminal 1:
echo    cd backend
echo    npm run dev
echo.
echo 2. Open PowerShell Terminal 2:
echo    cd frontend
echo    npm run dev
echo.
echo 3. Open browser:
echo    http://localhost:5173
echo.
echo To verify cluster:
echo    kubectl get nodes
echo    kubectl get pods -n ingress-nginx
echo.
pause

