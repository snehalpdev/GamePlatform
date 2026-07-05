# 1. Install Podman CLI using WinGet silently
Write-Host "Installing Podman CLI..." -ForegroundColor Cyan
winget install RedHat.Podman --silent --accept-source-agreements --accept-package-agreements

# 2. Refresh environment variables so the 'podman' command is recognized immediately
$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")

# 3. Initialize the Podman Linux machine (WSL backend)
Write-Host "Initializing Podman machine..." -ForegroundColor Cyan
podman machine init

# 4. Start the Podman engine
Write-Host "Starting Podman engine..." -ForegroundColor Cyan
podman machine start

# 5. Verify the installation
Write-Host "Verifying installation..." -ForegroundColor Cyan
podman run --rm quay.io/podman/hello
