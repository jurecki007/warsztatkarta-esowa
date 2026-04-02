Set-Location 'C:\Users\macie\OneDrive\Documents\Development\warsztatkarta-esowa'

# Fix package.json encoding (no BOM) and bump version to 0.5.2
$json = (git show origin/main:package.json) -replace '"version": "0.5.1"', '"version": "0.5.2"'
[System.IO.File]::WriteAllText("$PWD\package.json", ($json -join "`n"), [System.Text.UTF8Encoding]::new($false))

# Pass key as file path - Tauri v2 reads it directly
[System.Environment]::SetEnvironmentVariable('TAURI_SIGNING_PRIVATE_KEY', 'C:\Users\macie\.tauri\nyxserwis.key', 'Process')
[System.Environment]::SetEnvironmentVariable('TAURI_SIGNING_PRIVATE_KEY_PASSWORD', '', 'Process')

Write-Host "Signing key path set"

yarn tauri:build
