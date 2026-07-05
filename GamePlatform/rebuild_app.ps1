$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
# 1. Ensure the Podman backend machine is actually running
Write-Host "Checking Podman machine status..." -ForegroundColor Cyan
$machineStatus = podman machine inspect --format "{{.State}}" 2>$null
if ($machineStatus -ne "running") {
    Write-Host "Podman machine is not running. Starting it now..." -ForegroundColor Yellow
    podman machine start
}

# 2. Jump to your application source directory
Write-Host "Navigating to project directory..." -ForegroundColor Cyan
cd "C:\Stuff\Git\Personal\Test"


Write-Host "Cleaning up old container profiles..." -ForegroundColor Cyan
python -m podman_compose down 2>$null


Write-Host "Building and launching app via Podman Compose..." -ForegroundColor Cyan
python -m podman_compose up --build -d


# 6. Wait a couple of seconds for the container to fully initialize
Start-Sleep -Seconds 3

# 7. Print access URL
podman logs chefrpg_ai_backend