# Fix user PATH environment variable
Write-Output "=== Backup old user PATH ==="
$oldUserPath = [Environment]::GetEnvironmentVariable('Path', 'User')
if ($oldUserPath) {
    $backupFile = "$env:USERPROFILE\.env_path_backup_$(Get-Date -Format 'yyyyMMdd_HHmmss').txt"
    $oldUserPath | Out-File -FilePath $backupFile -Encoding utf8
    Write-Output "Backed up to: $backupFile"
    Write-Output ""
    Write-Output "Old PATH content:"
    $oldUserPath -split ';' | ForEach-Object { Write-Output "  $_" }
}

Write-Output ""
Write-Output "=== Set new user PATH ==="

$newUserPath = @(
    '%USERPROFILE%\AppData\Local\Microsoft\WindowsApps',
    '%USERPROFILE%\.local\bin',
    '%USERPROFILE%\AppData\Roaming\npm',
    '%USERPROFILE%\AppData\Local\Programs\Ollama',
    '%USERPROFILE%\OneDrive\Desktop\rtk-x86_64-pc-windows-msvc',
    'F:\VSCode\tools\python',
    'F:\VSCode\tools\node',
    'F:\VSCode\tools\jdk\bin',
    'F:\VSCode\tools\gcc\bin',
    'F:\CodeBuddy\bin',
    'F:\CodeBuddy CN\bin',
    'F:\Microsoft VS Code\bin',
    'F:\Zed\bin'
) -join ';'

Write-Output "New PATH content:"
$newUserPath -split ';' | ForEach-Object {
    $resolved = $_ -replace '%USERPROFILE%', $env:USERPROFILE
    if (Test-Path $resolved) {
        Write-Output "  [OK] $_"
    } else {
        Write-Output "  [MISSING] $_ (directory not found!)"
    }
}

[Environment]::SetEnvironmentVariable('Path', $newUserPath, 'User')

Write-Output ""
Write-Output "=== Check system PATH ==="
$sysPath = [Environment]::GetEnvironmentVariable('Path', 'Machine')
Write-Output "Current system PATH:"
$sysPath -split ';' | ForEach-Object {
    if (Test-Path $_) {
        Write-Output "  [OK] $_"
    } else {
        Write-Output "  [MISSING] $_ (directory not found!)"
    }
}

Write-Output ""
Write-Output "Done! Please restart your terminal for the new PATH to take effect."
