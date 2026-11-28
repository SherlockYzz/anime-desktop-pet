<#
.SYNOPSIS
    更新桌面 AI 桌宠快捷方式为当前版本
.DESCRIPTION
    从 package.json 动态读取版本号，同步更新既有桌宠快捷方式指向最新 dist\win-unpacked\AI桌宠.exe，
    并通知 Windows Shell 刷新图标缓存。
#>

[CmdletBinding()]
param(
    [switch]$CreateDesktop
)

$ErrorActionPreference = 'Stop'

$projectRoot = $PSScriptRoot
$pkgJson     = Get-Content (Join-Path $projectRoot 'package.json') -Raw -Encoding UTF8 | ConvertFrom-Json
$version     = if ($pkgJson.version) { $pkgJson.version } else { '8.1.0' }

$targetExe   = Join-Path $projectRoot 'dist\win-unpacked\AI桌宠.exe'
$workDir     = Join-Path $projectRoot 'dist\win-unpacked'
$iconPath    = Join-Path $projectRoot 'AI桌宠.ico'
$description = "二次元AI桌宠 v$version - 真透明与像素级物理穿透 · 九大角色全阵容 (点击直接启动)"

# 优先更新既有桌面收纳或主桌面快捷方式，避免在 F:\Desktop 散落重复副本
$candidates = @(
    'F:\Desktop\桌面收纳\AI 与大模型\AI桌宠.lnk',
    'F:\Desktop\AI桌宠.lnk'
)
$targets = @()
foreach ($c in $candidates) {
    if (Test-Path $c) { $targets += $c }
}
if ($CreateDesktop -and ($targets -notcontains 'F:\Desktop\AI桌宠.lnk')) {
    $targets += 'F:\Desktop\AI桌宠.lnk'
}
if ($targets.Count -eq 0) {
    $organizedDir = 'F:\Desktop\桌面收纳\AI 与大模型'
    $targets += if (Test-Path $organizedDir) { Join-Path $organizedDir 'AI桌宠.lnk' } else { 'F:\Desktop\AI桌宠.lnk' }
}

# 1. 存在性校验
if (-not (Test-Path $targetExe)) {
    throw "目标可执行文件不存在: $targetExe"
}
if (-not (Test-Path $iconPath)) {
    Write-Warning "指定图标文件未找到，将使用主程序内嵌图标: $iconPath"
    $iconLocation = "$targetExe,0"
} else {
    $iconLocation = "$iconPath,0"
}

# 2. 写入/更新快捷方式
$wsh = New-Object -ComObject WScript.Shell
foreach ($shortcutPath in $targets) {
    $shortcut = $wsh.CreateShortcut($shortcutPath)
    $shortcut.TargetPath       = $targetExe
    $shortcut.WorkingDirectory = $workDir
    $shortcut.Arguments        = ''
    $shortcut.IconLocation     = $iconLocation
    $shortcut.Description      = $description
    $shortcut.WindowStyle      = 1 # 正常窗口
    $shortcut.Save()

    Write-Host "✔ 快捷方式已成功更新: $shortcutPath" -ForegroundColor Green
    Write-Host "  - 目标程序: $targetExe" -ForegroundColor Gray
    Write-Host "  - 工作目录: $workDir" -ForegroundColor Gray
    Write-Host "  - 关联图标: $iconLocation" -ForegroundColor Gray
    Write-Host "  - 版本描述: $description" -ForegroundColor Gray
}

[System.Runtime.Interopservices.Marshal]::ReleaseComObject($wsh) | Out-Null
[System.GC]::Collect()

# 3. 刷新 Windows 桌面 Shell 图标缓存
try {
    $code = @"
using System;
using System.Runtime.InteropServices;
public class ShellNotifier {
    [DllImport("shell32.dll")]
    public static extern void SHChangeNotify(int wEventId, int uFlags, IntPtr dwItem1, IntPtr dwItem2);
    public static void RefreshDesktop() {
        // 0x08000000: SHCNE_ASSOCCHANGED
        SHChangeNotify(0x08000000, 0x0000, IntPtr.Zero, IntPtr.Zero);
    }
}
"@
    Add-Type -TypeDefinition $code -ErrorAction SilentlyContinue
    [ShellNotifier]::RefreshDesktop()
    Write-Host "✔ 已成功通知 Windows Shell 刷新桌面图标缓存与关联" -ForegroundColor Green
} catch {
    Write-Host "ℹ Windows Shell 刷新通知已跳过: $($_.Exception.Message)" -ForegroundColor Yellow
}

Write-Host "`n★ 交付验证通过：桌面快捷方式已同步至 v$version！" -ForegroundColor Cyan
