$baseUri = "https://raw.githubusercontent.com/jianchengwang/live2d_models/master/assets/model/moc/umaru"
$targetDir = "f:\Desktop\.DeskBox\文件夹\项目与开发\二次元桌宠项目\角色-土间埋"
$l2dDir = "$targetDir\Live2D模型"
$texDir = "$l2dDir\textures"
$motDir = "$l2dDir\motions"
$voiDir = "$l2dDir\voice"
$sndDir = "$targetDir\音频素材"
$imgDir = "$targetDir\图片素材"
$trgDir = "$targetDir\触发台词"

$dirs = @($targetDir, $l2dDir, $texDir, $motDir, $voiDir, $sndDir, $imgDir, $trgDir)
foreach ($d in $dirs) {
    if (-not (Test-Path $d)) {
        New-Item -ItemType Directory -Path $d -Force | Out-Null
    }
}

Write-Host "Downloading root model files..."
$rootFiles = @("model.json", "model.moc", "physics.json")
foreach ($f in $rootFiles) {
    $out = "$l2dDir\$f"
    Invoke-WebRequest -Uri "$baseUri/$f" -OutFile $out -TimeoutSec 20
    Write-Host "  -> $f ($((Get-Item $out).Length) bytes)"
}

Write-Host "Downloading textures..."
$texOut = "$texDir\texture_00.png"
Invoke-WebRequest -Uri "$baseUri/textures/texture_00.png" -OutFile $texOut -TimeoutSec 30
Write-Host "  -> texture_00.png ($((Get-Item $texOut).Length) bytes)"

Write-Host "Downloading motions..."
$motions = @(
    "rita_Live2D_001.mtn", "rita_Live2D_002.mtn", "rita_Live2D_003.mtn", "rita_Live2D_004.mtn",
    "rita_Live2D_005.mtn", "rita_Live2D_006.mtn", "rita_Live2D_007.mtn", "rita_Live2D_008.mtn",
    "rita_Live2D_009.mtn", "rita_Live2D_010.mtn", "rita_Live2D_011.mtn", "rita_Live2D_012.mtn",
    "rita_Live2D_013.mtn", "rita_Live2D_014.mtn", "rita_Live2D_015.mtn", "rita_Live2D_016.mtn",
    "rita_Live2D_017.mtn", "rita_Live2D_018.mtn", "rita_Live2D_019.mtn", "rita_Live2D_020.mtn",
    "rita_Live2D_021.mtn", "rita_Live2D_022.mtn", "rita_Live2D_023.mtn", "rita_Live2D_024.mtn",
    "rita_Live2D_025.mtn", "rita_Live2D_026.mtn", "rita_Live2D_027.mtn", "rita_Live2D_028.mtn",
    "rita_Live2D_029.mtn", "rita_Live2D_030.mtn", "rita_Live2D_031.mtn", "rita_Live2D_032.mtn",
    "rita_Live2D_033.mtn", "rita_Live2D_034.mtn", "umaru_idle.mtn"
)
foreach ($m in $motions) {
    $out = "$motDir\$m"
    Invoke-WebRequest -Uri "$baseUri/motions/$m" -OutFile $out -TimeoutSec 15
}
Write-Host "  -> Motions downloaded: $($motions.Count) files"

Write-Host "Downloading voice files..."
for ($i = 1; $i -le 35; $i++) {
    $num = "{0:D2}" -f $i
    $vName = "$num.wav"
    $vOut = "$voiDir\$vName"
    Invoke-WebRequest -Uri "$baseUri/voice/$vName" -OutFile $vOut -TimeoutSec 15
    Copy-Item $vOut "$sndDir\$vName" -Force
}
Write-Host "  -> Voice downloaded: 35 files (copied to 音频素材)"
Write-Host "ALL DOWNLOADS FINISHED SUCCESSFULLY!"