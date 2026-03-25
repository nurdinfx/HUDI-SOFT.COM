# Building the HudiSoftPOS Installer

This guide will help you create a professional Windows installer (.exe) for HudiSoftPOS that can be distributed to other computers.

## Option 1: Using Inno Setup (Recommended - Free & Easy)

### Step 1: Download and Install Inno Setup
1. Download Inno Setup from: https://jrsoftware.org/isdl.php
2. Install it (it's free and open source)

### Step 2: Build the Installer
1. Open Inno Setup Compiler
2. Open the file: `HudiSoftPOS_Installer.iss`
3. Click "Build" → "Compile" (or press F9)
4. The installer will be created in the `installer_output` folder as `HudiSoftPOS_Setup.exe`

### Step 3: Distribute
- Send the `HudiSoftPOS_Setup.exe` file to other computers
- Users can double-click it to install like any other Windows application
- The app will appear in:
  - Start Menu → HudiSoftPOS
  - Desktop (if user selects during installation)
  - Add/Remove Programs (for uninstallation)

## Option 2: Using WiX Toolset (Advanced - MSI Installer)

If you prefer an MSI installer instead:

1. Install WiX Toolset from: https://wixtoolset.org/
2. Create a WiX project file (.wxs)
3. Build using: `candle` and `light` commands

## Option 3: Simple Distribution (No Installer)

If you just want to distribute the executable:

1. Copy the entire `publish` folder to a USB drive or share it
2. Users can run `HudiSoftPOS.exe` directly
3. Note: This won't create Start Menu shortcuts or appear in Add/Remove Programs

## What the Installer Does

✅ Installs to Program Files (professional location)
✅ Creates Start Menu shortcuts
✅ Optional Desktop shortcut
✅ Appears in Add/Remove Programs
✅ Uses your HUDI SOFT logo as the icon
✅ Can be uninstalled cleanly
✅ Professional installation wizard

## File Locations

- **Installer Script**: `HudiSoftPOS_Installer.iss`
- **Output Folder**: `installer_output\`
- **Installer File**: `installer_output\HudiSoftPOS_Setup.exe`
- **Source Files**: `publish\` folder (created by `dotnet publish`)
