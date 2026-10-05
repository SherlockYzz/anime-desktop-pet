const fs = require('fs');
const path = require('path');

// 1. 深度分析 加藤惠 全部 16 个动作
console.log('==================== 加藤惠 ACTIONS ====================');
const megumiDir = '角色-加藤惠/Live2D模型/mtn';
fs.readdirSync(megumiDir).filter(f => f.endsWith('.mtn')).forEach(f => {
  const content = fs.readFileSync(path.join(megumiDir, f), 'utf8');
  let armL = '', armR = '', angleX = '', angleY = '', angleZ = '', eye = '', mouth = '', body = '', visible = [];
  content.split('\n').forEach(l => {
    if (l.startsWith('PARAM_ARM_L=')) armL = getRange(l);
    if (l.startsWith('PARAM_ARM_R=')) armR = getRange(l);
    if (l.startsWith('PARAM_ANGLE_X=')) angleX = getRange(l);
    if (l.startsWith('PARAM_ANGLE_Y=')) angleY = getRange(l);
    if (l.startsWith('PARAM_ANGLE_Z=')) angleZ = getRange(l);
    if (l.startsWith('PARAM_BODY_ANGLE_')) body += l.split('=')[0].replace('PARAM_BODY_ANGLE_', 'Body') + ':' + getRange(l) + ' ';
    if (l.startsWith('PARAM_EYE_L_OPEN=')) eye += 'EyeOpen:' + getRange(l) + ' ';
    if (l.startsWith('PARAM_EYE_L_SMILE=')) eye += 'Smile:' + getRange(l) + ' ';
    if (l.startsWith('PARAM_MOUTH_OPEN_Y=')) mouth += 'MouthOpen:' + getRange(l) + ' ';
    if (l.startsWith('VISIBLE:')) {
      const v = l.split('=');
      if (v[1] && v[1].includes('1')) visible.push(v[0].replace('VISIBLE:', ''));
    }
  });
  console.log(`[${f}] Head(X:${angleX}, Y:${angleY}, Z:${angleZ}) | Arm(L:${armL}, R:${armR}) | Body(${body.trim()}) | Eye(${eye.trim()}) | Mouth(${mouth.trim()}) | Vis(${visible.join(',')})`);
});

// 2. 深度分析 蕾姆 全部 34 个动作
console.log('\n==================== 蕾姆 ACTIONS ====================');
const remDir = '角色-蕾姆/Live2D模型/motions';
fs.readdirSync(remDir).filter(f => f.endsWith('.mtn')).forEach(f => {
  const content = fs.readFileSync(path.join(remDir, f), 'utf8');
  let angleX = '', angleY = '', angleZ = '', eye = '', mouth = '', body = '', parts = [];
  content.split('\n').forEach(l => {
    if (l.startsWith('PARAM_ANGLE_X=')) angleX = getRange(l);
    if (l.startsWith('PARAM_ANGLE_Y=')) angleY = getRange(l);
    if (l.startsWith('PARAM_ANGLE_Z=')) angleZ = getRange(l);
    if (l.startsWith('PARAM_BODY_ANGLE_')) body += l.split('=')[0].replace('PARAM_BODY_ANGLE_', 'Body') + ':' + getRange(l) + ' ';
    if (l.startsWith('PARAM_EYE_L_OPEN=')) eye += 'EyeOpen:' + getRange(l) + ' ';
    if (l.startsWith('PARAM_EYE_L_SMILE=')) eye += 'Smile:' + getRange(l) + ' ';
    if (l.startsWith('PARAM_MOUTH_OPEN_Y=')) mouth += 'MouthOpen:' + getRange(l) + ' ';
    if (l.startsWith('VISIBLE:')) {
      const partsArr = l.split('=');
      if (partsArr[1] && (partsArr[1].includes('1') || partsArr[1].split(',').some(x => Number(x) > 0.5))) {
        parts.push(partsArr[0].replace('VISIBLE:', ''));
      }
    }
  });
  console.log(`[${f}] Head(X:${angleX}, Y:${angleY}, Z:${angleZ}) | Body(${body.trim()}) | Eye(${eye.trim()}) | Mouth(${mouth.trim()}) | Parts(${parts.join(',')})`);
});

// 3. 深度分析 初音未来
console.log('\n==================== 初音未来 ACTIONS ====================');
const mikuDir = '角色-初音未来/Live2D模型/mtn';
fs.readdirSync(mikuDir).filter(f => f.endsWith('.mtn')).forEach(f => {
  const content = fs.readFileSync(path.join(mikuDir, f), 'utf8');
  let angleX = '', angleY = '', angleZ = '', body = '', eye = '';
  content.split('\n').forEach(l => {
    if (l.startsWith('PARAM_ANGLE_X=')) angleX = getRange(l);
    if (l.startsWith('PARAM_ANGLE_Y=')) angleY = getRange(l);
    if (l.startsWith('PARAM_ANGLE_Z=')) angleZ = getRange(l);
    if (l.startsWith('PARAM_BODY_ANGLE_')) body += l.split('=')[0].replace('PARAM_BODY_ANGLE_', 'Body') + ':' + getRange(l) + ' ';
    if (l.startsWith('PARAM_EYE_L_OPEN=')) eye += 'Eye:' + getRange(l) + ' ';
  });
  console.log(`[${f}] Head(X:${angleX}, Y:${angleY}, Z:${angleZ}) | Body(${body.trim()}) | Eye(${eye.trim()})`);
});

function getRange(line) {
  const v = line.split('=')[1];
  if (!v) return '0';
  const nums = v.split(',').map(Number).filter(n => !isNaN(n));
  if (!nums.length) return '0';
  const min = Math.min(...nums);
  const max = Math.max(...nums);
  if (min === max) return `${min}`;
  return `${min.toFixed(1)}~${max.toFixed(1)}`;
}
