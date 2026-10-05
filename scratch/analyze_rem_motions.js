const fs = require('fs');
const path = require('path');

const dir = '角色-蕾姆/Live2D模型/motions';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.mtn'));
files.sort();

console.log('=== REM MOTIONS ANALYSIS ===');
for (const f of files) {
  const content = fs.readFileSync(path.join(dir, f), 'utf8');
  const lines = content.split('\n');
  const interesting = [];
  for (const l of lines) {
    if (l.startsWith('#') || l.startsWith('$') || !l.includes('=')) continue;
    const [param, valStr] = l.split('=');
    const vals = valStr.split(',').map(Number).filter(n => !isNaN(n));
    if (vals.length === 0) continue;
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const diff = max - min;
    if (diff > 0.05) {
      interesting.push(`${param}(range:${diff.toFixed(2)}, min:${min.toFixed(2)}, max:${max.toFixed(2)})`);
    }
  }
  console.log(`\n--- ${f} ---`);
  console.log(interesting.slice(0, 8).join('\n  '));
}
