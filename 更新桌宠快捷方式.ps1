<#
.SYNOPSIS
    更新桌面 AI 桌宠快捷方式为最新版本 (v8.0.1)
.DESCRIPTION
    更新 F:\Desktop\AI桌宠.lnk，准确指向最新 dist\win-unpacked\AI桌宠.exe，
    配置专属高分辨率图标与工作目录，并触发 Windows Shell 图标缓存刷新。
#>

[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "   二次元AI桌宠 - 桌面快捷方式更新引擎   " -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

$desktopPath  = "F:\Desktop"
$shortcutPath = Join-Path $desktopPath "AI桌宠.lnk"
$targetExe    = "F:\Desktop\.DeskBox\文件夹\项目与开发\二次元桌宠项目\dist\win-unpacked\AI桌宠.exe"
$workDir      = "F:\Desktop\.DeskBox\文件夹\项目与开发\二次元桌宠项目\dist\win-unpacked"
$iconPath     = "F:\Desktop\.DeskBox\文件夹\项目与开发\二次元桌宠项目\AI桌宠.ico"
$description  = "二次元AI桌宠 v8.0.1 - 真透明与像素级物理穿透 · 九大角色全阵容 (点击直接启动)"

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
$shortcut = $wsh.CreateShortcut($shortcutPath)
$shortcut.TargetPath       = $targetExe
$shortcut.WorkingDirectory = $workDir
$shortcut.IconLocation     = $iconLocation
$shortcut.Description      = $description
$shortcut.WindowStyle      = 1 # 正常窗口
$shortcut.Save()

[System.Runtime.Interopservices.Marshal]::ReleaseComObject($wsh) | Out-Null
[System.GC]::Collect()

Write-Host "✔ 快捷方式已成功写入: $shortcutPath" -ForegroundColor Green
Write-Host "  - 目标程序: $targetExe" -ForegroundColor Gray
Write-Host "  - 工作目录: $workDir" -ForegroundColor Gray
Write-Host "  - 关联图标: $iconLocation" -ForegroundColor Gray
Write-Host "  - 版本描述: $description" -ForegroundColor Gray

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

Write-Host "`n★ 交付验证通过：桌面快捷方式已升级为最新版！" -ForegroundColor Cyan