Set-Location 'C:\Users\macie\OneDrive\Documents\Development\warsztatkarta-esowa'

$key = (Get-Content 'C:\Users\macie\.tauri\nyxserwis.key' -Raw).Trim()
$exe = 'src-tauri\target\release\bundle\nsis\NyxSerwis_0.5.2_x64-setup.exe'

$env:TAURI_SIGNING_PRIVATE_KEY = $key
$env:TAURI_SIGNING_PRIVATE_KEY_PASSWORD = ''

# Use env vars for key+password, only pass the file positionally
& node "node_modules/@tauri-apps/cli/tauri.js" "signer" "sign" $exe
