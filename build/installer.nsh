!macro customInstall
  DetailPrint "Searching for existing browser..."
  
  ; Use PowerShell to find Chrome or Edge and set the environment variable
  nsExec::ExecToStack 'powershell -NoProfile -ExecutionPolicy Bypass -Command "& { \
    $$paths = @( \
      \"$$env:ProgramFiles\Google\Chrome\Application\chrome.exe\", \
      \"$${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe\", \
      \"$$env:LOCALAPPDATA\Google\Chrome\Application\chrome.exe\", \
      \"$$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe\", \
      \"$${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe\" \
    ); \
    $$found = $$null; \
    foreach ($$p in $$paths) { \
      if (Test-Path $$p) { $$found = $$p; break } \
    } \
    if ($$found) { \
      [Environment]::SetEnvironmentVariable(\"PUPPETEER_EXECUTABLE_PATH\", $$found, \"Machine\"); \
      Write-Output \"Found browser: $$found\"; \
    } else { \
      Write-Output \"No browser found\"; \
    } \
  }"'
  
  Pop $0 ; Return code
  Pop $1 ; Output
  DetailPrint "$1"
  
  ; Refresh environment variables so the system picks up the change
  SendMessage ${HWND_BROADCAST} ${WM_SETTINGCHANGE} 0 "STR:Environment" /TIMEOUT=5000
!macroend
