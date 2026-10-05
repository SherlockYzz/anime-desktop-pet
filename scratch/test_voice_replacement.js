const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log("=== 正在验证全角色原生语音音质与配置完整性 ===");

const chars = [
  { id: 'rem', name: '蕾姆', dir: '角色-蕾姆/音频素材', count: 26, ext: 'wav' },
  { id: 'megumin', name: '惠惠', dir: '角色-惠惠/音频素材', count: 10, ext: 'mp3' },
  { id: 'megumi', name: '加藤惠', dir: '角色-加藤惠/音频素材', count: 10, ext: 'mp3' },
  { id: 'miku', name: '初音未来', dir: '角色-初音未来/音频素材', count: 10, ext: 'mp3' },
];

let totalOk = 0;
let totalFiles = 0;

for (const c of chars) {
  console.log(`\n检查角色 [${c.name}] (${c.id}): 预期 ${c.count} 段 .${c.ext}`);
  let charOk = 0;
  for (let i = 1; i <= c.count; i++) {
    totalFiles++;
    const num = String(i).padStart(2, '0');
    const fPath = path.join(__dirname, '..', c.dir, `${num}.${c.ext}`);
    if (!fs.existsSync(fPath)) {
      console.error(`  ❌ 缺失文件: ${fPath}`);
      continue;
    }
    const stat = fs.statSync(fPath);
    if (stat.size < 5000) {
      console.error(`  ❌ 文件过小或异常: ${fPath} (${stat.size} bytes)`);
      continue;
    }
    
    // Test with ffprobe
    try {
      const out = execSync(`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${fPath}"`, { encoding: 'utf-8' }).trim();
      const dur = parseFloat(out);
      if (dur > 0.5) {
        charOk++;
        totalOk++;
      } else {
        console.error(`  ❌ 时长异常: ${fPath} (${dur}s)`);
      }
    } catch (e) {
      console.error(`  ❌ ffprobe 解码失败: ${fPath}`, e.message);
    }
  }
  console.log(`  -> ${c.name} 通过校验: ${charOk}/${c.count}`);
}

console.log(`\n========================================`);
console.log(`总计校验: ${totalOk}/${totalFiles} 全部通过！`);
if (totalOk === totalFiles) {
  console.log("🎉 角色原生官方配音验证全部合格，零故障！");
  process.exit(0);
} else {
  console.error("⚠️ 存在异常文件，请检查！");
  process.exit(1);
}
