# Rebuild and publish HudiSoftPOS with icon
# Run: powershell -ExecutionPolicy Bypass -File BuildAndPublish.ps1
# IMPORTANT: Close HudiSoftPOS app before running (file lock will cause build to fail)

$ErrorActionPreference = "Stop"
$projectDir = $PSScriptRoot

Write-Host "=== HudiSoftPOS Build and Publish ===" -ForegroundColor Cyan
Write-Host ""

$assetsDir = Join-Path $projectDir "Assets"
$logoIco = Join-Path $assetsDir "logo.ico"
$logoPng = Join-Path $assetsDir "logo.png"

# FORCE regenerate logo.ico using System.Drawing at high quality (256x256)
Write-Host "Regenerating high-quality logo.ico from logo.png..." -ForegroundColor Yellow
if (Test-Path $logoPng) {
    if (Test-Path $logoIco) { Remove-Item $logoIco -Force }
    
    try {
        Add-Type -AssemblyName System.Drawing
        $sourceBmp = [System.Drawing.Bitmap]::FromFile($logoPng)
        
        # Create a high-quality 256x256 bitmap for the icon (Best for modern Windows Explorer)
        $targetBmp = New-Object System.Drawing.Bitmap(256, 256)
        $g = [System.Drawing.Graphics]::FromImage($targetBmp)
        $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
        $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
        $g.DrawImage($sourceBmp, 0, 0, 256, 256)
        
        # Get icon handle and save
        $hIcon = $targetBmp.GetHicon()
        $icon = [System.Drawing.Icon]::FromHandle($hIcon)
        
        $fs = [System.IO.File]::Create($logoIco)
        $icon.Save($fs)
        $fs.Close()
        
        # Cleanup
        $icon.Dispose()
        $g.Dispose()
        $targetBmp.Dispose()
        $sourceBmp.Dispose()
        
        Write-Host "  Success: Created fresh 256x256 logo.ico" -ForegroundColor Green
    } catch {
        Write-Host "  WARNING: Failed to generate icon via System.Drawing: $_" -ForegroundColor Yellow
        Write-Host "  Continuing with existing icon if available..." -ForegroundColor Gray
    }
} else {
    Write-Host "ERROR: No logo.png in Assets folder" -ForegroundColor Red
    exit 1
}

# Clean
Write-Host "Cleaning bin/obj/publish..." -ForegroundColor Yellow
Remove-Item -Recurse -Force (Join-Path $projectDir "bin") -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force (Join-Path $projectDir "obj") -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force (Join-Path $projectDir "publish") -ErrorAction SilentlyContinue

# Build
Write-Host "Building Release..." -ForegroundColor Yellow
Push-Location $projectDir
dotnet build HudiSoftPOS.csproj -c Release
if ($LASTEXITCODE -ne 0) { Pop-Location; exit 1 }

# Publish
Write-Host "Publishing to publish folder..." -ForegroundColor Yellow
dotnet publish HudiSoftPOS.csproj -c Release -r win-x64 --self-contained true `
    -p:PublishSingleFile=false -o publish
if ($LASTEXITCODE -ne 0) { Pop-Location; exit 1 }
Pop-Location

# Copy artifacts to publish folder
Copy-Item $logoIco -Destination (Join-Path $projectDir "publish\logo.ico") -Force
Copy-Item $logoPng -Destination (Join-Path $projectDir "publish\logo.png") -Force
Write-Host "  Copied logo files to publish folder" -ForegroundColor Green

# Rename the published EXE to a friendly name (keeps embedded icon)
$oldExe = Join-Path $projectDir "publish\HudiSoftPOS.exe"
$newExe = Join-Path $projectDir "publish\Hudi-Soft.exe"

if (Test-Path $oldExe) {
    if (Test-Path $newExe) { Remove-Item -Force $newExe -ErrorAction SilentlyContinue }
    Rename-Item -Path $oldExe -NewName "Hudi-Soft.exe" -Force
    Write-Host "  Renamed EXE to Hudi-Soft.exe" -ForegroundColor Green
}

Write-Host ""
Write-Host "=== Done ===" -ForegroundColor Green
Write-Host "Output: publish\Hudi-Soft.exe" -ForegroundColor Cyan
Write-Host "Taskbar icon: Provided by logo.png resource" -ForegroundColor Gray
Write-Host "Explorer icon: Multi-frame/256px logo.ico embedded in .exe" -ForegroundColor Gray
