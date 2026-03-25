# PowerShell script to check for Inno Setup and build installer
# This script helps automate the installer creation process

Write-Host "HudiSoftPOS Installer Builder" -ForegroundColor Cyan
Write-Host "==============================" -ForegroundColor Cyan
Write-Host ""

# Check if publish folder exists
if (-not (Test-Path "publish\Hudi-Soft.exe")) {
    Write-Host "ERROR: publish folder not found!" -ForegroundColor Red
    Write-Host "Please run BuildAndPublish.ps1 first (or dotnet publish ... -o publish)" -ForegroundColor Yellow
    exit 1
}

Write-Host "[OK] Found published executable" -ForegroundColor Green

# Check for Inno Setup
$innoSetupPaths = @(
    "${env:ProgramFiles(x86)}\Inno Setup 6\ISCC.exe",
    "${env:ProgramFiles}\Inno Setup 6\ISCC.exe",
    "${env:ProgramFiles(x86)}\Inno Setup 5\ISCC.exe",
    "${env:ProgramFiles}\Inno Setup 5\ISCC.exe"
)

$innoSetup = $null
foreach ($path in $innoSetupPaths) {
    if (Test-Path $path) {
        $innoSetup = $path
        break
    }
}

if ($null -eq $innoSetup) {
    Write-Host ""
    Write-Host "Inno Setup not found!" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Please install Inno Setup:" -ForegroundColor Cyan
    Write-Host "1. Download from: https://jrsoftware.org/isdl.php" -ForegroundColor White
    Write-Host "2. Install it" -ForegroundColor White
    Write-Host "3. Run this script again" -ForegroundColor White
    Write-Host ""
    Write-Host "OR manually:" -ForegroundColor Cyan
    Write-Host "1. Open Inno Setup Compiler" -ForegroundColor White
    Write-Host "2. Open HudiSoftPOS_Installer.iss" -ForegroundColor White
    Write-Host "3. Click Build -> Compile" -ForegroundColor White
    Write-Host ""
    exit 1
}

Write-Host "[OK] Found Inno Setup at: $innoSetup" -ForegroundColor Green

# Create installer output directory
if (-not (Test-Path "installer_output")) {
    New-Item -ItemType Directory -Path "installer_output" | Out-Null
}

Write-Host ""
Write-Host "Building installer..." -ForegroundColor Cyan
Write-Host ""

# Build the installer
& $innoSetup "HudiSoftPOS_Installer.iss"

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "[SUCCESS] Installer created successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Installer location: installer_output\HudiSoftPOS_Setup.exe" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "You can now distribute this installer to other computers." -ForegroundColor White
} else {
    Write-Host ""
    Write-Host "[ERROR] Failed to build installer" -ForegroundColor Red
    exit 1
}
