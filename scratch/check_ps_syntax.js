const { execSync } = require('child_process');
const target = 'F:\\Desktop\\.DeskBox\\文件夹\\反重力产出\\脚本\\更新桌宠快捷方式.ps1';
const cmd = `powershell -NoProfile -ExecutionPolicy Bypass -Command "$errs = @(); [System.Management.Automation.Language.Parser]::ParseFile('${target}', [ref]$null, [ref]$errs); if ($errs.Count -gt 0) { Write-Error ($errs | Out-String); exit 1 } else { Write-Output 'PARSER_OK' }"`;

const out = execSync(cmd, { encoding: 'utf8' });
console.log(out.trim());
