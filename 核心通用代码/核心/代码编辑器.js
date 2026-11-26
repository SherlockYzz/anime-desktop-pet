// 二次元桌宠 - 代码编辑器管理器
// 负责代码编辑器功能：编辑、语法模板、复制、运行
class CodeEditor {
  constructor(app) {
    this.app = app;
  }

  init() {
    const input = document.getElementById('code-input');
    const lineNums = document.getElementById('line-numbers');
    const langSelect = document.getElementById('language-select');
    if (!input || !lineNums) return;

    const update = () => {
      const lines = input.value.split('\n').length;
      lineNums.innerHTML = Array.from({ length: lines }, (_, i) => i + 1).join('<br>');
    };

    input.addEventListener('input', update);
    input.addEventListener('scroll', () => { lineNums.scrollTop = input.scrollTop; });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') {
        e.preventDefault();
        const s = input.selectionStart, end = input.selectionEnd;
        input.value = input.value.substring(0, s) + '    ' + input.value.substring(end);
        input.selectionStart = input.selectionEnd = s + 4;
        update();
      }
    });

    if (langSelect) {
      langSelect.addEventListener('change', () => {
        input.value = this._getTemplate(langSelect.value);
        update();
      });
      input.value = this._getTemplate(langSelect.value);
    }
    update();

    // 绑定按钮
    document.getElementById('btn-copy')?.addEventListener('click', () => this.copy());
    document.getElementById('btn-run')?.addEventListener('click', () => this.run());
    document.getElementById('btn-ai-code')?.addEventListener('click', () => this.generateWithAI());
  }

  updateLineNumbers() {
    const input = document.getElementById('code-input');
    const lineNums = document.getElementById('line-numbers');
    if (!input || !lineNums) return;
    lineNums.innerHTML = Array.from({ length: input.value.split('\n').length }, (_, i) => i + 1).join('<br>');
  }

  copy() {
    const input = document.getElementById('code-input');
    if (!input) return;
    navigator.clipboard.writeText(input.value).then(() => {
      const btn = document.getElementById('btn-copy');
      if (!btn) return;
      btn.textContent = '已复制';
      setTimeout(() => { btn.textContent = '复制'; }, 2000);
    });
  }

  run() {
    const input = document.getElementById('code-input');
    const output = document.getElementById('output-content');
    if (!input || !output) return;
    const code = input.value;
    if (!code.trim()) { output.textContent = '没有代码可运行'; return; }

    const lang = document.getElementById('language-select')?.value || 'javascript';
    if (lang !== 'javascript') {
      output.textContent = `当前只支持运行JavaScript代码\n${lang}代码已复制到剪贴板`;
      this.copy();
      return;
    }

    output.textContent = '正在沙箱中运行...';
    output.style.color = '#888';

    // 使用独立 Web Worker 沙箱执行，彻底隔离 DOM、localStorage 与 electronAPI，并加 3 秒超时保护防死循环
    const workerSource = `
      self.onmessage = function(e) {
        const logs = [];
        const fmt = (a) => {
          if (typeof a === 'object' && a !== null) {
            try { return JSON.stringify(a, null, 2); } catch (_) { return String(a); }
          }
          return String(a);
        };
        const sandboxConsole = {
          log: (...args) => logs.push(args.map(fmt).join(' ')),
          error: (...args) => logs.push('[ERROR] ' + args.map(fmt).join(' ')),
          warn: (...args) => logs.push('[WARN] ' + args.map(fmt).join(' ')),
          info: (...args) => logs.push(args.map(fmt).join(' ')),
        };
        try {
          const fn = new Function('console', e.data);
          const result = fn(sandboxConsole);
          if (result !== undefined) logs.push('返回值: ' + fmt(result));
          self.postMessage({ ok: true, logs });
        } catch (err) {
          self.postMessage({ ok: false, message: err.message || String(err), stack: err.stack || '' });
        }
      };
    `;

    try {
      const blob = new Blob([workerSource], { type: 'application/javascript' });
      const blobUrl = URL.createObjectURL(blob);
      const worker = new Worker(blobUrl);
      let finished = false;

      const cleanup = () => {
        finished = true;
        clearTimeout(timer);
        worker.terminate();
        URL.revokeObjectURL(blobUrl);
      };

      const timer = setTimeout(() => {
        if (!finished) {
          cleanup();
          output.textContent = '错误: 代码执行超时（超过 3 秒），已自动终止以防止界面卡死';
          output.style.color = '#c45a5a';
        }
      }, 3000);

      worker.onmessage = (ev) => {
        if (finished) return;
        cleanup();
        const data = ev.data || {};
        if (data.ok) {
          output.textContent = data.logs && data.logs.length > 0 ? data.logs.join('\n') : '代码运行成功（无输出）';
          output.style.color = '#5a8a64';
        } else {
          output.textContent = `错误: ${data.message}\n\n${data.stack || ''}`;
          output.style.color = '#c45a5a';
        }
      };

      worker.onerror = (err) => {
        if (finished) return;
        cleanup();
        output.textContent = `错误: ${err.message || '沙箱执行异常'}`;
        output.style.color = '#c45a5a';
      };

      worker.postMessage(code);
    } catch (err) {
      output.textContent = `错误: 无法初始化沙箱 (${err.message})`;
      output.style.color = '#c45a5a';
    }
  }

  async generateWithAI() {
    const input = document.getElementById('code-ai-input');
    if (!input) return;
    const desc = input.value.trim();
    if (!desc || this.app.isLoading) return;

    const lang = document.getElementById('language-select')?.value || 'javascript';
    const prompt = `请用${lang}编写以下功能的代码，只返回代码，不需要解释：\n${desc}`;
    this.app.showLoading(true);
    try {
      const result = await window.mimoAPI.sendMessage(prompt, true);
      const resp = typeof result === 'object' ? result.content : result;
      const match = resp.match(/```(?:\w+)?\n([\s\S]*?)```/);
      const code = match ? match[1] : resp;
      document.getElementById('code-input').value = code;
      this.updateLineNumbers();
      window.live2dManager.playAnimation('happy');
    } catch (err) {
      this.app.showToast('生成代码失败: ' + err.message);
    } finally {
      this.app.showLoading(false);
    }
  }

  _getTemplate(lang) {
    const t = {
      python: `#!/usr/bin/env python3\n# -*- coding: utf-8 -*-\n\ndef main():\n    print("Hello, World!")\n\nif __name__ == "__main__":\n    main()\n`,
      javascript: `// JavaScript\nfunction main() {\n    console.log("Hello, World!");\n}\n\nmain();\n`,
      java: `public class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello, World!");\n    }\n}\n`,
      c: `#include <stdio.h>\n\nint main() {\n    printf("Hello, World!\\n");\n    return 0;\n}\n`,
      cpp: `#include <iostream>\nusing namespace std;\n\nint main() {\n    cout << "Hello, World!" << endl;\n    return 0;\n}\n`,
      csharp: `using System;\nnamespace HelloWorld {\n    class Program {\n        static void Main() {\n            Console.WriteLine("Hello, World!");\n        }\n    }\n}\n`,
      go: `package main\n\nimport "fmt"\n\nfunc main() {\n    fmt.Println("Hello, World!")\n}\n`,
      rust: `fn main() {\n    println!("Hello, World!");\n}\n`,
      typescript: `function main(): void {\n    console.log("Hello, World!");\n}\n\nmain();\n`,
      html: `<!DOCTYPE html>\n<html><head><title>Document</title></head><body><h1>Hello, World!</h1></body></html>\n`,
      css: `* { margin: 0; padding: 0; box-sizing: border-box; }\nbody { font-family: sans-serif; }\n`,
      sql: `SELECT * FROM table_name WHERE condition ORDER BY column;\n`,
      php: `<?php\necho "Hello, World!\\n";\n?>\n`,
      ruby: `puts "Hello, World!"\n`,
      swift: `print("Hello, World!")\n`,
      kotlin: `fun main() {\n    println("Hello, World!")\n}\n`,
      shell: `#!/bin/bash\necho "Hello, World!"\n`
    };
    return t[lang] || `// ${lang}\n`;
  }
}
