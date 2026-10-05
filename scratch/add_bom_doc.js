const fs = require('fs');
const target = 'F:\\Desktop\\.DeskBox\\文件夹\\反重力产出\\文档\\桌宠窗口缩放上限与默认尺寸恢复修复交付报告.md';
const buf = fs.readFileSync(target);
if (buf[0] !== 0xEF || buf[1] !== 0xBB || buf[2] !== 0xBF) {
  const bom = Buffer.from([0xEF, 0xBB, 0xBF]);
  fs.writeFileSync(target, Buffer.concat([bom, buf]));
  console.log('Added UTF-8 BOM to delivery report');
} else {
  console.log('Delivery report already has UTF-8 BOM');
}
