; Inno Setup Script for HudiSoftPOS
; This creates a professional Windows installer (.exe) that can be distributed

[Setup]
; App Information
AppName=HudiSoftPOS
AppVersion=1.0
AppPublisher=HUDI SOFT SYSTEMS
AppPublisherURL=https://www.hudisoft.com
AppSupportURL=https://www.hudisoft.com
AppUpdatesURL=https://www.hudisoft.com
DefaultDirName={autopf}\HudiSoftPOS
DefaultGroupName=HudiSoftPOS
AllowNoIcons=yes
LicenseFile=
OutputDir=installer_output
OutputBaseFilename=Hudi-Soft-POS-Setup
SetupIconFile=publish\logo.ico
Compression=lzma
SolidCompression=yes
WizardStyle=modern
PrivilegesRequired=admin
ArchitecturesInstallIn64BitMode=x64

; Uninstall Information
UninstallDisplayIcon={app}\Hudi-Soft.exe
UninstallDisplayName=HudiSoftPOS

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: unchecked
Name: "quicklaunchicon"; Description: "{cm:CreateQuickLaunchIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: unchecked; OnlyBelowVersion: 6.1

[Files]
; All publish output (exe, DLLs, icom1.ico) so app runs and shows icon
Source: "publish\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs

[Icons]
Name: "{group}\HudiSoftPOS"; Filename: "{app}\Hudi-Soft.exe"; IconFilename: "{app}\logo.ico"
Name: "{group}\{cm:UninstallProgram,HudiSoftPOS}"; Filename: "{uninstallexe}"
Name: "{autodesktop}\HudiSoftPOS"; Filename: "{app}\Hudi-Soft.exe"; IconFilename: "{app}\logo.ico"; Tasks: desktopicon
Name: "{userappdata}\Microsoft\Internet Explorer\Quick Launch\HudiSoftPOS"; Filename: "{app}\Hudi-Soft.exe"; IconFilename: "{app}\logo.ico"; Tasks: quicklaunchicon

[Run]
Filename: "{app}\Hudi-Soft.exe"; Description: "{cm:LaunchProgram,HudiSoftPOS}"; Flags: nowait postinstall skipifsilent

[Registry]
; Add to Add/Remove Programs
Root: HKLM; Subkey: "Software\Microsoft\Windows\CurrentVersion\Uninstall\HudiSoftPOS"; ValueType: string; ValueName: "DisplayName"; ValueData: "HudiSoftPOS"
Root: HKLM; Subkey: "Software\Microsoft\Windows\CurrentVersion\Uninstall\HudiSoftPOS"; ValueType: string; ValueName: "DisplayVersion"; ValueData: "1.0"
Root: HKLM; Subkey: "Software\Microsoft\Windows\CurrentVersion\Uninstall\HudiSoftPOS"; ValueType: string; ValueName: "Publisher"; ValueData: "HUDI SOFT SYSTEMS"
Root: HKLM; Subkey: "Software\Microsoft\Windows\CurrentVersion\Uninstall\HudiSoftPOS"; ValueType: string; ValueName: "UninstallString"; ValueData: """{uninstallexe}"""
Root: HKLM; Subkey: "Software\Microsoft\Windows\CurrentVersion\Uninstall\HudiSoftPOS"; ValueType: string; ValueName: "DisplayIcon"; ValueData: "{app}\logo.ico"
