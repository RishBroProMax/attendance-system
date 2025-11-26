; Custom NSIS Installer Script for Attendance System
; Uses MUI2 for modern UI

!include "MUI2.nsh"
!include "FileFunc.nsh"

;--------------------------------
;General

  ;Name and file
  Name "Attendance System"
  OutFile "AttendanceSystemSetup.exe"
  Unicode True

  ;Default installation folder
  ;User requested Program Files by default
  InstallDir "$PROGRAMFILES64\Attendance System"
  
  ;Get installation folder from registry if available
  InstallDirRegKey HKCU "Software\AttendanceSystem" ""

  ;Request application privileges for Windows Vista+
  RequestExecutionLevel admin

;--------------------------------
;Interface Settings

  !define MUI_ABORTWARNING
  !define MUI_ICON "icons/icon.ico" 
  !define MUI_UNICON "icons/icon.ico"

;--------------------------------
;Pages

  !insertmacro MUI_PAGE_WELCOME
  !insertmacro MUI_PAGE_LICENSE "LICENSE" ; Ensure a LICENSE file exists or remove this
  !insertmacro MUI_PAGE_DIRECTORY
  !insertmacro MUI_PAGE_INSTFILES
  
  ;Custom Finish Page
  !define MUI_FINISHPAGE_RUN "$INSTDIR\attendance-system-v2.exe"
  !define MUI_FINISHPAGE_RUN_TEXT "Launch Attendance System"
  !insertmacro MUI_PAGE_FINISH

  !insertmacro MUI_UNPAGE_WELCOME
  !insertmacro MUI_UNPAGE_CONFIRM
  !insertmacro MUI_UNPAGE_INSTFILES
  !insertmacro MUI_UNPAGE_FINISH

;--------------------------------
;Languages

  !insertmacro MUI_LANGUAGE "English"

;--------------------------------
;Installer Sections

Section "Attendance System" SecDummy

  SetOutPath "$INSTDIR"
  
  ;ADD YOUR OWN FILES HERE...
  ;The Tauri build process will replace this placeholder or we point to the build output
  ;For a custom script used by Tauri, we usually let Tauri handle the file copying via its bundle config,
  ;but if we are overriding the script completely, we need to know where the files are.
  ;However, Tauri's "nsis" config allows specifying a template.
  ;If this is a template, we use specific placeholders.
  ;If this is a standalone script, we need to manually include files.
  ;Assuming this is a TEMPLATE for Tauri:
  
  ; Tauri will inject file installation commands here if we use the standard template structure.
  ; But since the user wants a "fully customized" one, we might need to rely on Tauri's `nsis.template` option.
  ; Let's assume this file is `src-tauri/installer.nsi` and we will point `tauri.conf.json` to it.
  
  ; In Tauri v1, custom NSIS templates use specific markers.
  ; Let's try to stick to a standard NSIS script that Tauri can use as a template.
  
  File /r "target\release\bundle\nsis\*.*" ; This is tricky because we don't know the exact output path before build.
  
  ; Actually, the best way to customize Tauri NSIS is to use the `tauri.conf.json` configuration 
  ; and provide a custom template if needed.
  ; The user wants:
  ; - Choose install path (Standard in Tauri NSIS)
  ; - Program Files default (Standard for perMachine)
  ; - Desktop + Start Menu shortcuts (Standard)
  ; - Uninstall entry (Standard)
  ; - Custom pages (Welcome, License, Directory) (Standard MUI)
  ; - Post-install message (Standard Finish Page)
  ; - File associations (Configurable in tauri.conf.json)
  
  ; So most of this can be done via `tauri.conf.json`.
  ; The "Custom pages" part is standard MUI which Tauri uses.
  ; The "License" page requires a license file.
  
  ; Let's create a dummy LICENSE file first.
  
  ; Create shortcuts
  CreateDirectory "$SMPROGRAMS\Attendance System"
  CreateShortcut "$SMPROGRAMS\Attendance System\Attendance System.lnk" "$INSTDIR\attendance-system-v2.exe"
  CreateShortcut "$SMPROGRAMS\Attendance System\Uninstall.lnk" "$INSTDIR\Uninstall.exe"
  CreateShortcut "$DESKTOP\Attendance System.lnk" "$INSTDIR\attendance-system-v2.exe"

  ;Store installation folder
  WriteRegStr HKCU "Software\AttendanceSystem" "" $INSTDIR
  
  ;Create uninstaller
  WriteUninstaller "$INSTDIR\Uninstall.exe"
  
  ;Register file association for .bbak
  WriteRegStr HKCR ".bbak" "" "AttendanceSystem.Backup"
  WriteRegStr HKCR "AttendanceSystem.Backup" "" "Attendance System Backup"
  WriteRegStr HKCR "AttendanceSystem.Backup\DefaultIcon" "" "$INSTDIR\attendance-system-v2.exe,0"
  WriteRegStr HKCR "AttendanceSystem.Backup\shell\open\command" "" '"$INSTDIR\attendance-system-v2.exe" "%1"'

SectionEnd

;--------------------------------
;Uninstaller Section

Section "Uninstall"

  ;Remove files
  Delete "$INSTDIR\*.*"
  RMDir "$INSTDIR"

  ;Remove shortcuts
  Delete "$SMPROGRAMS\Attendance System\*.lnk"
  RMDir "$SMPROGRAMS\Attendance System"
  Delete "$DESKTOP\Attendance System.lnk"

  ;Remove registry keys
  DeleteRegKey /ifempty HKCU "Software\AttendanceSystem"
  DeleteRegKey HKCR ".bbak"
  DeleteRegKey HKCR "AttendanceSystem.Backup"

SectionEnd
