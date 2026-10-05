const fs = require('fs');
const path = require('path');

function analyzeDir(dirName, filterExt) {
  console.log(`\n================== ${dirName} ==================`);
  if (!fs.existsSync(dirName)) return;
  const files = fs.readdirSync(dirName).filter(f => f.endsWith(filterExt));
  files.sort();
  for (const f of files) {
    const content = fs.readFileSync(path.join(dirName, f), 'utf8');
    const lines = content.split('\n');
    const movements = [];
    for (const l of lines) {
      if (l.startsWith('#') || l.startsWith('$') || !l.includes('=')) continue;
      const [param, valStr] = l.split('=');
      const vals = valStr.split(',').map(Number).filter(n => !isNaN(n));
      if (vals.length === 0) continue;
      const min = Math.min(...vals);
      const max = Math.max(...vals);
      const diff = max - min;
      if (diff > 0.1 && (param.includes('ARM') || param.includes('HAND') || param.includes('BODY') || param.includes('ANGLE') || param.includes('VISIBLE') || param.includes('POSE') || param.includes('EYE') || param.includes('MOUTH'))) {
        movements.push(`${param}(range:${diff.toFixed(1)}, max:${max.toFixed(1)}, min:${min.toFixed(1)})`);
      }
    }
    console.log(`[${f}] -> ${movements.slice(0, 6).join('; ')}`);
  }
}

// 1. 加藤惠
analyzeDir('角色-加藤惠/Live2D模型/mtn', '.mtn');

// 2. 初音未来
analyzeDir('角色-初音未来/Live2D模型/mtn', '.mtn');

// 3. 惠惠
function analyzeMoc3Dir(dirName) {
  console.log(`\n================== ${dirName} ==================`);
  if (!fs.existsSync(dirName)) return;
  const files = fs.readdirSync(dirName).filter(f => f.endsWith('.json'));
  files.sort();
  for (const f of files) {
    try {
      const json = JSON.parse(fs.readFileSync(path.join(dirName, f), 'utf8'));
      const curves = json.Curves || [];
      const interesting = curves.map(c => {
        const segs = c.Segments || [];
        const vals = segs.filter((v, i) => i % 3 === 1 || i % 2 === 1);
        return c.Id;
      }).filter(id => id.includes('Arm') || id.includes('Body') || id.includes('Angle') || id.includes('Param'));
      console.log(`[${f}] -> curves count: ${curves.length}, key curves: ${interesting.slice(0, 6).join(', ')}`);
    } catch(e){}
  }
}

analyzeMoc3Dir('角色-惠惠/Live2D模型/motions');
analyzeMoc3Dir('角色-高木同学/Live2D模型/motions');
