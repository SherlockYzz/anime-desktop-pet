const fs = require('fs');
const target = 'F:\\Desktop\\.DeskBox\\文件夹\\反重力产出\\脚本\\更新桌宠快捷方式.ps1';
const buf = fs.readFileSync(target);
if (buf[0] !== 0xEF || buf[1] !== 0xBB || buf[2] !== 0xBF) {
  const bom = Buffer.from([0xEF, 0xBB, 0xBF]);
  fs.writeFileSync(target, Buffer.concat([bom, buf]));
  console.log('Added UTF-8 BOM successfully');
} else {
  console.log('File already has UTF-8 BOM');
}
