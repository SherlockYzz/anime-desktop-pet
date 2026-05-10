// 二次元桌宠 - 渲染进程主逻辑（多角色 + 多API支持版）
// 优化：调试代码清理、聊天历史限制、无操作检测、定时器优化
const MAX_CHAT_MESSAGES = 50;
const IDLE_CHECK_INTERVAL = 120000; // 2分钟检查一次（原60秒）
const IDLE_TIMEOUT = 30000; // 30秒无操作触发闲置台词
const INACTIVE_THRESHOLD = 300000; // 5分钟无操作降低优先级

class App {
  constructor() {
    this.settings = this.loadSettings();
    this.currentTab = 'chat';
    this.isLoading = false;
    this.clickCount = 0;
    this.clickTimer = null;
    this.idleTimer = null;
    this.idleTimeout = IDLE_TIMEOUT;
    this.lastInteraction = Date.now();
    this._isThrottled = false;
    this._inactivityTimer = null;
    this.init();
  }

  async init() {
    const characterId = await window.characterManager.loadSavedCharacter();

    this.bindEvents();
    this.applySettings();
    this.startIdleTimer();
    this.startInactivityMonitor();
    this.showBootMessage();
    this.checkSpecialDate();

    this.initMarkdown();
    this.initCodeEditor();
    this.initCharacterSelector();
    this.initProviderSelector();

    this.initLive2D();
    this.initDreamStars();

    // 初始化显示模式按钮
    this.updateModeButton(window.live2dManager.getDisplayMode());
  }

  async initLive2D() {
    try {
      await window.live2dManager.init();
      // 应用保存的显示模式
      const savedMode = window.live2dManager.getDisplayMode();
      if (savedMode === 'gif') {
        await window.live2dManager.switchToGifMode();
      }
    } catch (error) {
      // Live2D加载失败时静默降级到封面图
      window.live2dManager?.showFallback();
    }
  }

  // 生成梦幻星星装饰
  initDreamStars() {
    const container = document.getElementById('dream-stars');
    if (!container) return;
    const count = 12;
    for (let i = 0; i < count; i++) {
      const star = document.createElement('div');
      star.className = 'star';
      star.style.left = (5 + Math.random() * 90) + '%';
      star.style.top = (5 + Math.random() * 90) + '%';
      star.style.setProperty('--duration', (2 + Math.random() * 4) + 's');
      star.style.setProperty('--delay', (Math.random() * 3) + 's');
      if (Math.random() > 0.7) {
        star.style.width = '4px';
        star.style.height = '4px';
      }
      container.appendChild(star);
    }
  }

  showBootMessage() {
    const bootLine = window.characterManager.getRandomLine('boot');
    const messagesContainer = document.getElementById('chat-messages');
    const firstMsg = messagesContainer.querySelector('.message-text');
    if (firstMsg) firstMsg.textContent = bootLine;
  }

  checkSpecialDate() {
    if (window.characterManager.isBirthday()) {
      setTimeout(() => {
        const birthdayLine = window.characterManager.getRandomLine('special');
        this.addMessage('ai', birthdayLine);
        window.live2dManager.triggerSpecial('birthday');
      }, 3000);
    }
  }

  startIdleTimer() {
    const checkIdle = () => {
      const elapsed = Date.now() - this.lastInteraction;
      if (elapsed >= this.idleTimeout && !this.isLoading) {
        const idleLine = window.characterManager.getRandomLine('idle');
        this.addMessage('ai', idleLine);
        window.live2dManager.triggerIdle();
        this.lastInteraction = Date.now();
      }
    };
    this.idleTimer = setInterval(checkIdle, IDLE_CHECK_INTERVAL);
  }

  // 无操作监控：5分钟无操作降低运行频率
  startInactivityMonitor() {
    const checkInactivity = () => {
      const elapsed = Date.now() - this.lastInteraction;
      if (elapsed >= INACTIVE_THRESHOLD && !this._isThrottled) {
        this._isThrottled = true;
        // 降低idle检查频率到5分钟一次
        if (this.idleTimer) clearInterval(this.idleTimer);
        this.idleTimer = setInterval(() => {
          const e = Date.now() - this.lastInteraction;
          if (e >= this.idleTimeout && !this.isLoading) {
            const idleLine = window.characterManager.getRandomLine('idle');
            this.addMessage('ai', idleLine);
            window.live2dManager.triggerIdle();
            this.lastInteraction = Date.now();
          }
        }, 300000);
      }
    };
    this._inactivityTimer = setInterval(checkInactivity, 60000);
  }

  // 恢复正常运行频率
  _restoreThrottle() {
    if (this._isThrottled) {
      this._isThrottled = false;
      if (this.idleTimer) clearInterval(this.idleTimer);
      this.startIdleTimer();
    }
  }

  resetIdleTimer() {
    this.lastInteraction = Date.now();
    this._restoreThrottle();
  }

  initMarkdown() {
    if (window.marked) {
      marked.use({
        breaks: true,
        gfm: true,
        renderer: {
          code({ text, lang }) {
            let highlighted = text;
            if (window.hljs && lang && hljs.getLanguage(lang)) {
              try { highlighted = hljs.highlight(text, { language: lang }).value; } catch (e) {}
            } else if (window.hljs) {
              try { highlighted = hljs.highlightAuto(text).value; } catch (e) {}
            }
            return `<pre><code class="hljs language-${lang || ''}">${highlighted}</code></pre>`;
          }
        }
      });
    }
  }

  initCodeEditor() {
    const codeInput = document.getElementById('code-input');
    const lineNumbers = document.getElementById('line-numbers');
    const languageSelect = document.getElementById('language-select');

    if (codeInput && lineNumbers) {
      const updateLineNumbers = () => {
        const lines = codeInput.value.split('\n').length;
        lineNumbers.innerHTML = Array.from({ length: lines }, (_, i) => i + 1).join('<br>');
      };

      codeInput.addEventListener('input', updateLineNumbers);
      codeInput.addEventListener('scroll', () => {
        lineNumbers.scrollTop = codeInput.scrollTop;
      });

      codeInput.addEventListener('keydown', (e) => {
        if (e.key === 'Tab') {
          e.preventDefault();
          const start = codeInput.selectionStart;
          const end = codeInput.selectionEnd;
          codeInput.value = codeInput.value.substring(0, start) + '    ' + codeInput.value.substring(end);
          codeInput.selectionStart = codeInput.selectionEnd = start + 4;
          updateLineNumbers();
        }
      });

      if (languageSelect) {
        languageSelect.addEventListener('change', () => {
          const template = this.getCodeTemplate(languageSelect.value);
          codeInput.value = template;
          updateLineNumbers();
        });
        codeInput.value = this.getCodeTemplate(languageSelect.value);
      }

      updateLineNumbers();
    }
  }

  getCodeTemplate(lang) {
    const templates = {
      python: `#!/usr/bin/env python3\n# -*- coding: utf-8 -*-\n\ndef main():\n    print("Hello, World!")\n\nif __name__ == "__main__":\n    main()\n`,
      javascript: `// JavaScript\nfunction main() {\n    console.log("Hello, World!");\n}\n\nmain();\n`,
      java: `public class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello, World!");\n    }\n}\n`,
      c: `#include <stdio.h>\n#include <stdlib.h>\n\nint main() {\n    printf("Hello, World!\\n");\n    return 0;\n}\n`,
      cpp: `#include <iostream>\nusing namespace std;\n\nint main() {\n    cout << "Hello, World!" << endl;\n    return 0;\n}\n`,
      csharp: `using System;\n\nnamespace HelloWorld {\n    class Program {\n        static void Main(string[] args) {\n            Console.WriteLine("Hello, World!");\n        }\n    }\n}\n`,
      go: `package main\n\nimport "fmt"\n\nfunc main() {\n    fmt.Println("Hello, World!")\n}\n`,
      rust: `fn main() {\n    println!("Hello, World!");\n}\n`,
      typescript: `function main(): void {\n    console.log("Hello, World!");\n}\n\nmain();\n`,
      html: `<!DOCTYPE html>\n<html>\n<head><title>Document</title></head>\n<body>\n    <h1>Hello, World!</h1>\n</body>\n</html>\n`,
      css: `* {\n    margin: 0;\n    padding: 0;\n    box-sizing: border-box;\n}\n\nbody {\n    font-family: sans-serif;\n    line-height: 1.6;\n}\n`,
      sql: `SELECT * FROM table_name WHERE condition ORDER BY column_name;\n`,
      php: `<?php\necho "Hello, World!\\n";\n?>\n`,
      ruby: `puts "Hello, World!"\n`,
      swift: `print("Hello, World!")\n`,
      kotlin: `fun main() {\n    println("Hello, World!")\n}\n`,
      shell: `#!/bin/bash\necho "Hello, World!"\n`
    };
    return templates[lang] || `// ${lang}\n`;
  }

  bindEvents() {
    // 显示模式切换按钮
    document.getElementById('btn-toggle-mode')?.addEventListener('click', () => {
      this.toggleDisplayMode();
    });

    document.getElementById('btn-minimize')?.addEventListener('click', () => {
      window.electronAPI.minimizeWindow();
    });

    document.getElementById('btn-close')?.addEventListener('click', () => {
      const farewellLine = window.characterManager.getRandomLine('farewell');
      this.addMessage('ai', farewellLine);
      window.live2dManager.playAnimation('wave');
      setTimeout(() => window.electronAPI.closeWindow(), 1500);
    });

    document.getElementById('btn-settings')?.addEventListener('click', () => {
      this.showSettings();
    });

    document.querySelectorAll('.tab').forEach(tab => {
      tab.addEventListener('click', (e) => {
        this.switchTab(e.target.dataset.tab);
      });
    });

    document.getElementById('btn-chat-send')?.addEventListener('click', () => {
      this.sendChatMessage();
    });

    document.getElementById('chat-input')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.sendChatMessage();
      }
    });

    document.getElementById('btn-ai-code')?.addEventListener('click', () => {
      this.generateCode();
    });

    document.getElementById('btn-copy')?.addEventListener('click', () => {
      this.copyCode();
    });

    document.getElementById('btn-run')?.addEventListener('click', () => {
      this.runCode();
    });

    document.getElementById('btn-close-settings')?.addEventListener('click', () => {
      this.hideSettings();
    });

    document.getElementById('btn-save-settings')?.addEventListener('click', () => {
      this.saveSettings();
    });

    document.getElementById('opacity-slider')?.addEventListener('input', (e) => {
      document.getElementById('opacity-value').textContent = e.target.value + '%';
    });

    window.electronAPI.onShowSettings(() => {
      this.showSettings();
    });

    // 角色选择
    document.getElementById('btn-character-select')?.addEventListener('click', () => {
      this.showCharacterSelector();
    });

    document.getElementById('btn-close-character')?.addEventListener('click', () => {
      this.hideCharacterSelector();
    });

    // 清除聊天记录
    document.getElementById('btn-clear-chat')?.addEventListener('click', () => {
      this.clearChatWithConfirm();
    });

    // API提供商选择联动
    document.getElementById('api-provider')?.addEventListener('change', (e) => {
      this.onProviderChange(e.target.value);
    });

    // 测试连接
    document.getElementById('btn-test-connection')?.addEventListener('click', () => {
      this.testConnection();
    });

    // Live2D容器点击交互
    const live2dContainer = document.getElementById('live2d-container');
    if (live2dContainer) {
      live2dContainer.addEventListener('click', () => {
        this.handleCharacterClick();
      });
    }

    document.addEventListener('mousemove', () => this.resetIdleTimer());
    document.addEventListener('keydown', () => this.resetIdleTimer());

    // AI头像点击反应（事件委托，支持动态添加的消息）
    document.getElementById('chat-messages')?.addEventListener('click', (e) => {
      const avatar = e.target.closest('.message.ai .message-avatar');
      if (avatar) {
        this.handleCharacterClick();
      }
    });
  }

  // ===== 角色选择器 =====
  initCharacterSelector() {
    const characters = window.characterManager.getAllCharacters();
    const currentId = window.characterManager.currentCharacterId;
    const grid = document.getElementById('character-grid');
    if (!grid) return;

    grid.innerHTML = '';
    characters.forEach(char => {
      const card = document.createElement('div');
      card.className = `character-card ${char.id === currentId ? 'active' : ''}`;
      card.dataset.characterId = char.id;

      const avatarPath = `${char.avatar}`;

      card.innerHTML = `
        <div class="character-card-avatar" style="background: ${char.theme.primary}20; border-color: ${char.theme.primary}40;">
          <img src="${avatarPath}" alt="${char.name}" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
          <span class="character-card-icon" style="color: ${char.theme.primary}; display:none;">${char.name.charAt(0)}</span>
        </div>
        <div class="character-card-info">
          <div class="character-card-name" style="color: ${char.theme.primary};">${char.name}</div>
          <div class="character-card-series">${char.series}</div>
          <div class="character-card-tagline">${char.tagline}</div>
        </div>
        ${char.id === currentId ? '<div class="character-card-badge">当前</div>' : ''}
      `;

      // 鼠标悬停时预缓存该角色资源
      card.addEventListener('mouseenter', () => {
        if (char.id !== currentId) {
          window.characterManager.precacheCharacter(char.id);
        }
      });

      card.addEventListener('click', () => this.switchCharacter(char.id));
      grid.appendChild(card);
    });
  }

  showCharacterSelector() {
    const panel = document.getElementById('character-panel');
    if (panel) {
      this.initCharacterSelector();
      panel.classList.add('show');
    }
  }

  hideCharacterSelector() {
    document.getElementById('character-panel')?.classList.remove('show');
  }

  async switchCharacter(characterId) {
    if (this._switchingCharacter) return;
    const char = window.characterManager.registry[characterId];
    if (!char) return;

    const currentChar = window.characterManager.getCurrentCharacter();
    if (currentChar && currentChar.id === characterId) {
      this.hideCharacterSelector();
      return;
    }

    this._switchingCharacter = true;
    this.showToast(`正在加载 ${char.name}...`);

    try {
      await window.mimoAPI.switchCharacter(characterId);
      this.hideCharacterSelector();
      this.clearChatMessages();

      const bootLine = window.characterManager.getRandomLine('boot');
      this.addBootMessage(bootLine);
      this.updateAvatars();

      // 根据当前显示模式加载对应的内容
      const currentMode = window.live2dManager.getDisplayMode();
      if (currentMode === 'gif') {
        await window.live2dManager.switchToGifMode();
      } else {
        await window.live2dManager.loadCharacterModel();
      }

      this.showToast(`已切换到 ${char.name}`);
    } finally {
      this._switchingCharacter = false;
    }
  }

  clearChatMessages() {
    const messagesContainer = document.getElementById('chat-messages');
    if (messagesContainer) messagesContainer.innerHTML = '';
  }

  // 清除聊天记录（带确认）
  clearChatWithConfirm() {
    const messagesContainer = document.getElementById('chat-messages');
    if (!messagesContainer) return;
    const count = messagesContainer.querySelectorAll('.message').length;
    if (count <= 1) {
      this.showToast('没有聊天记录需要清除');
      return;
    }
    this.clearChatMessages();
    window.mimoAPI.clearHistory();
    const bootLine = window.characterManager.getRandomLine('boot');
    this.addBootMessage(bootLine);
    this.showToast('聊天记录已清除');
  }

  // 限制消息数量，超过MAX_CHAT_MESSAGES自动删除最早的
  _trimMessages() {
    const messagesContainer = document.getElementById('chat-messages');
    if (!messagesContainer) return;
    const messages = messagesContainer.querySelectorAll('.message');
    if (messages.length > MAX_CHAT_MESSAGES) {
      const removeCount = messages.length - MAX_CHAT_MESSAGES;
      for (let i = 0; i < removeCount; i++) {
        messages[i].remove();
      }
    }
  }

  addBootMessage(text) {
    const messagesContainer = document.getElementById('chat-messages');
    if (!messagesContainer) return;

    const avatarPath = window.characterManager.getAvatarPath();
    const charName = window.characterManager.getCurrentCharacter()?.name || '';

    const messageDiv = document.createElement('div');
    messageDiv.className = 'message ai';
    messageDiv.innerHTML = `
      <div class="message-avatar"><img src="${avatarPath}" alt="${charName}"></div>
      <div class="message-content">
        <div class="message-text">${text}</div>
      </div>
    `;
    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  updateAvatars() {
    const avatarPath = window.characterManager.getAvatarPath();
    const charName = window.characterManager.getCurrentCharacter()?.name || '';
    document.querySelectorAll('.message.ai .message-avatar img').forEach(img => {
      img.src = `${avatarPath}`;
      img.alt = charName;
    });
  }

  // ===== API 提供商选择器 =====
  initProviderSelector() {
    const select = document.getElementById('api-provider');
    if (!select) return;

    const providers = window.getProviderList();
    select.innerHTML = '';
    providers.forEach(p => {
      const opt = document.createElement('option');
      opt.value = p.id;
      opt.textContent = p.name;
      select.appendChild(opt);
    });

    select.value = this.settings.provider || 'local';
    this.onProviderChange(select.value, true);
  }

  onProviderChange(providerId, skipRestore) {
    const provider = window.getProvider(providerId);
    if (!provider) return;

    const descEl = document.getElementById('provider-description');
    if (descEl) descEl.textContent = provider.description;

    const modelSelect = document.getElementById('model-select');
    const customModelDiv = document.getElementById('setting-custom-model');
    const modelDiv = document.getElementById('setting-model');

    if (providerId === 'custom') {
      if (modelDiv) modelDiv.style.display = 'none';
      if (customModelDiv) customModelDiv.style.display = 'block';
      const customInput = document.getElementById('custom-model-input');
      if (customInput && !skipRestore) customInput.value = '';
      if (customInput && skipRestore) customInput.value = this.settings.customModel || '';
    } else {
      if (modelDiv) modelDiv.style.display = 'block';
      if (customModelDiv) customModelDiv.style.display = 'none';

      if (modelSelect) {
        modelSelect.innerHTML = '';
        provider.models.forEach(m => {
          const opt = document.createElement('option');
          opt.value = m.id;
          opt.textContent = m.name;
          modelSelect.appendChild(opt);
        });
        if (!skipRestore && provider.models.length > 0) {
          modelSelect.value = provider.models[0].id;
        } else if (skipRestore) {
          modelSelect.value = this.settings.model || provider.models[0]?.id || '';
        }
      }
    }

    const baseUrlInput = document.getElementById('api-base-url');
    if (baseUrlInput) {
      if (providerId === 'custom') {
        baseUrlInput.readOnly = false;
        if (!skipRestore) baseUrlInput.value = '';
        if (skipRestore) baseUrlInput.value = this.settings.baseUrl || '';
      } else {
        baseUrlInput.readOnly = false;
        if (!skipRestore) baseUrlInput.value = provider.baseUrl;
        if (skipRestore) baseUrlInput.value = this.settings.baseUrl || provider.baseUrl;
      }
    }

    const apiKeyDiv = document.getElementById('setting-api-key');
    if (apiKeyDiv) {
      apiKeyDiv.style.display = 'block';
      const apiKeyInput = document.getElementById('api-key');
      if (apiKeyInput) {
        if (!provider.needsKey) {
          apiKeyInput.placeholder = '本地模型无需API Key';
          apiKeyInput.disabled = true;
        } else {
          apiKeyInput.placeholder = '输入你的API Key';
          apiKeyInput.disabled = false;
        }
        if (skipRestore) apiKeyInput.value = this.settings.apiKey || '';
      }
    }

    const testResult = document.getElementById('test-result');
    if (testResult) {
      testResult.className = 'test-result';
      testResult.textContent = '';
    }
  }

  async testConnection() {
    const btn = document.getElementById('btn-test-connection');
    const result = document.getElementById('test-result');
    if (!btn || !result) return;

    btn.disabled = true;
    btn.textContent = '测试中...';
    result.className = 'test-result';
    result.textContent = '';

    const provider = document.getElementById('api-provider')?.value;
    const baseUrl = document.getElementById('api-base-url')?.value;
    const apiKey = document.getElementById('api-key')?.value;
    const model = provider === 'custom'
      ? document.getElementById('custom-model-input')?.value
      : document.getElementById('model-select')?.value;

    const origBaseUrl = window.mimoAPI.baseUrl;
    const origApiKey = window.mimoAPI.apiKey;
    const origModel = window.mimoAPI.model;

    window.mimoAPI.setBaseUrl(baseUrl);
    window.mimoAPI.setApiKey(apiKey);
    window.mimoAPI.setModel(model);

    try {
      const res = await window.mimoAPI.testConnection();
      if (res.success) {
        result.className = 'test-result success';
        result.textContent = '连接成功';
      } else {
        result.className = 'test-result error';
        result.textContent = `连接失败: ${res.message}`;
      }
    } catch (e) {
      result.className = 'test-result error';
      result.textContent = `错误: ${e.message}`;
    } finally {
      window.mimoAPI.setBaseUrl(origBaseUrl);
      window.mimoAPI.setApiKey(origApiKey);
      window.mimoAPI.setModel(origModel);
      btn.disabled = false;
      btn.textContent = '测试连接';
    }
  }

  // ===== 角色点击 =====
  handleCharacterClick() {
    this.resetIdleTimer();
    this.clickCount++;

    if (this.clickTimer) clearTimeout(this.clickTimer);

    if (this.clickCount >= 3) {
      const situation = Math.random() > 0.5 ? 'tsukkomi' : 'jealous';
      const line = window.characterManager.getRandomLine(situation);
      this.addMessage('ai', line);
      window.live2dManager.updateMood('annoyed');
      this.clickCount = 0;
    } else {
      const clickLine = window.characterManager.getRandomLine('click');
      this.addMessage('ai', clickLine);
      window.live2dManager.updateMood('normal');
    }

    this.clickTimer = setTimeout(() => { this.clickCount = 0; }, 2000);
  }

  switchTab(tabName) {
    this.currentTab = tabName;
    document.querySelectorAll('.tab').forEach(tab => {
      tab.classList.toggle('active', tab.dataset.tab === tabName);
    });
    document.querySelectorAll('.tab-content').forEach(content => {
      content.classList.toggle('active', content.id === `tab-${tabName}`);
    });
  }

  isSimpleMessage(message) {
    if (message.length > 20) return false;
    if (message.includes('```')) return false;
    if ((message.match(/\?|？/g) || []).length > 1) return false;
    if (message.split('\n').length > 2) return false;
    return true;
  }

  async sendChatMessage() {
    const input = document.getElementById('chat-input');
    const message = input.value.trim();
    if (!message || this.isLoading) return;

    this.resetIdleTimer();
    this.addMessage('user', message);
    input.value = '';

    this.isLoading = true;
    const sendBtn = document.getElementById('btn-chat-send');
    if (sendBtn) sendBtn.disabled = true;

    const simple = this.isSimpleMessage(message);

    if (simple) {
      await this._sendSimpleMessage(message, sendBtn);
    } else {
      await this._sendComplexMessage(message, sendBtn);
    }
  }

  _showKaomojiLoading() {
    const kaomojis = ['(・∀・)', '(´∀`)', '(・ω・)', '(｡◕‿◕｡)', '(◕ᴗ◕✿)', '(◠‿◠)', '(◕‿◕)', 'ヽ(>∀<☆)ノ'];
    const messagesContainer = document.getElementById('chat-messages');
    const div = document.createElement('div');
    div.className = 'message ai';
    div.id = 'kaomoji-loading';
    const avatarPath = window.characterManager.getAvatarPath();
    const charName = window.characterManager.getCurrentCharacter()?.name || '';
    div.innerHTML = `
      <div class="message-avatar"><img src="${avatarPath}" alt="${charName}"></div>
      <div class="message-content"><div class="kaomoji-text"></div></div>
    `;
    messagesContainer.appendChild(div);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;

    let idx = 0;
    const textEl = div.querySelector('.kaomoji-text');
    this._kaomojiInterval = setInterval(() => {
      textEl.textContent = kaomojis[idx % kaomojis.length];
      idx++;
    }, 400);
    textEl.textContent = kaomojis[0];
  }

  _hideKaomojiLoading() {
    if (this._kaomojiInterval) {
      clearInterval(this._kaomojiInterval);
      this._kaomojiInterval = null;
    }
    const el = document.getElementById('kaomoji-loading');
    if (el) el.remove();
  }

  async _sendSimpleMessage(message, sendBtn) {
    this._showKaomojiLoading();
    try {
      const result = await window.mimoAPI.sendMessage(message, false, 'low');
      this._hideKaomojiLoading();
      const thinking = typeof result === 'object' ? result.thinking : '';
      const content = typeof result === 'object' ? result.content : result;
      this.addMessage('ai', content, thinking);
      try { window.live2dManager.updateByAIResponse(content); } catch (e) {}
      this._trimMessages();
    } catch (error) {
      this._hideKaomojiLoading();
      this.addMessage('ai', `出错了: ${error.message}`);
    } finally {
      this.isLoading = false;
      if (sendBtn) sendBtn.disabled = false;
    }
  }

  async _sendComplexMessage(message, sendBtn) {
    const streamElements = this.createStreamMessage();

    try {
      const result = await window.mimoAPI.sendMessageStream(message, false, (type, chunk, full) => {
        this.updateStreamMessage(streamElements, type, full);
      }, 'high');

      const thinking = typeof result === 'object' ? result.thinking : '';
      const content = typeof result === 'object' ? result.content : result;

      this.finalizeStreamMessage(streamElements, content, thinking);
      try { window.live2dManager.updateByAIResponse(content); } catch (e) {}
      this._trimMessages();
    } catch (error) {
      this.finalizeStreamMessage(streamElements, `出错了: ${error.message}`, '');
    } finally {
      this.isLoading = false;
      if (sendBtn) sendBtn.disabled = false;
    }
  }

  createStreamMessage() {
    const messagesContainer = document.getElementById('chat-messages');
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message ai';

    const avatarPath = window.characterManager.getAvatarPath();
    const charName = window.characterManager.getCurrentCharacter()?.name || '';

    messageDiv.innerHTML = `
      <div class="message-avatar"><img src="${avatarPath}" alt="${charName}"></div>
      <div class="message-content">
        <div class="thinking-block streaming">
          <button class="thinking-toggle" onclick="this.parentElement.classList.toggle('expanded')">
            <span class="thinking-arrow">&#9654;</span>
            <span class="thinking-label">思考中...</span>
          </button>
          <div class="thinking-content"></div>
        </div>
        <div class="message-text"><span class="streaming-cursor"></span></div>
      </div>
    `;

    messagesContainer.appendChild(messageDiv);

    return {
      container: messageDiv,
      thinkingBlock: messageDiv.querySelector('.thinking-block'),
      thinkingLabel: messageDiv.querySelector('.thinking-label'),
      thinkingContent: messageDiv.querySelector('.thinking-content'),
      messageText: messageDiv.querySelector('.message-text'),
      messagesContainer
    };
  }

  updateStreamMessage(el, type, fullText) {
    if (type === 'thinking') {
      el.thinkingContent.textContent = fullText;
      el.thinkingLabel.textContent = '思考中...';
      if (!el.thinkingBlock.classList.contains('expanded')) {
        el.thinkingBlock.classList.add('expanded');
      }
    } else if (type === 'content') {
      el.messageText.textContent = fullText;
    }
    el.messagesContainer.scrollTop = el.messagesContainer.scrollHeight;
  }

  finalizeStreamMessage(el, content, thinking) {
    const cursor = el.messageText.querySelector('.streaming-cursor');
    if (cursor) cursor.remove();

    if (thinking) {
      const renderedThinking = window.marked
        ? (() => { try { return marked.parse(thinking); } catch (e) { return this.escapeHtml(thinking).replace(/\n/g, '<br>'); } })()
        : this.escapeHtml(thinking).replace(/\n/g, '<br>');
      el.thinkingContent.innerHTML = renderedThinking;
      el.thinkingLabel.textContent = '思考过程';
      el.thinkingBlock.classList.remove('streaming');
      el.thinkingBlock.classList.remove('expanded');
    } else {
      el.thinkingBlock.remove();
    }

    let renderedContent = content;
    if (window.marked) {
      try {
        const cleaned = content.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
        renderedContent = marked.parse(cleaned || content);
      } catch (e) { renderedContent = this.escapeHtml(content).replace(/\n/g, '<br>'); }
    } else {
      renderedContent = this.escapeHtml(content).replace(/\n/g, '<br>');
    }
    el.messageText.innerHTML = renderedContent;
    el.messagesContainer.scrollTop = el.messagesContainer.scrollHeight;
  }

  addMessage(type, content, thinking) {
    const messagesContainer = document.getElementById('chat-messages');
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;

    let avatar = '你';
    if (type === 'ai') {
      const avatarPath = window.characterManager.getAvatarPath();
      const charName = window.characterManager.getCurrentCharacter()?.name || '';
      avatar = `<img src="${avatarPath}" alt="${charName}">`;
    }

    let renderedContent = content;
    if (window.marked && type === 'ai') {
      try {
        const cleaned = content.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
        renderedContent = marked.parse(cleaned || content);
      } catch (e) { renderedContent = this.escapeHtml(content).replace(/\n/g, '<br>'); }
    } else {
      renderedContent = this.escapeHtml(content).replace(/\n/g, '<br>');
    }

    let thinkingBlock = '';
    if (thinking && type === 'ai') {
      const renderedThinking = window.marked
        ? (() => { try { return marked.parse(thinking); } catch (e) { return this.escapeHtml(thinking).replace(/\n/g, '<br>'); } })()
        : this.escapeHtml(thinking).replace(/\n/g, '<br>');
      thinkingBlock = `
        <div class="thinking-block">
          <button class="thinking-toggle" onclick="this.parentElement.classList.toggle('expanded')">
            <span class="thinking-arrow">&#9654;</span>
            <span class="thinking-label">思考过程</span>
          </button>
          <div class="thinking-content">${renderedThinking}</div>
        </div>`;
    }

    messageDiv.innerHTML = `
      <div class="message-avatar">${avatar}</div>
      <div class="message-content">
        ${thinkingBlock}
        <div class="message-text">${renderedContent}</div>
      </div>
    `;

    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
    this._trimMessages();
  }

  async generateCode() {
    const input = document.getElementById('code-ai-input');
    const description = input.value.trim();
    if (!description || this.isLoading) return;

    const language = document.getElementById('language-select').value;
    const prompt = `请用${language}编写以下功能的代码，只返回代码，不需要解释：\n${description}`;

    this.showLoading(true);
    try {
      const result = await window.mimoAPI.sendMessage(prompt, true);
      const response = typeof result === 'object' ? result.content : result;
      const codeMatch = response.match(/```(?:\w+)?\n([\s\S]*?)```/);
      const code = codeMatch ? codeMatch[1] : response;
      document.getElementById('code-input').value = code;
      this.updateCodeLineNumbers();
      window.live2dManager.playAnimation('happy');
    } catch (error) {
      alert('生成代码失败: ' + error.message);
    } finally {
      this.showLoading(false);
    }
  }

  updateCodeLineNumbers() {
    const codeInput = document.getElementById('code-input');
    const lineNumbers = document.getElementById('line-numbers');
    const lines = codeInput.value.split('\n').length;
    lineNumbers.innerHTML = Array.from({ length: lines }, (_, i) => i + 1).join('<br>');
  }

  copyCode() {
    const codeInput = document.getElementById('code-input');
    navigator.clipboard.writeText(codeInput.value).then(() => {
      const btn = document.getElementById('btn-copy');
      btn.textContent = '已复制';
      setTimeout(() => { btn.textContent = '复制'; }, 2000);
    });
  }

  runCode() {
    const codeInput = document.getElementById('code-input');
    const code = codeInput.value;
    const outputContent = document.getElementById('output-content');

    if (!code.trim()) {
      outputContent.textContent = '没有代码可运行';
      return;
    }

    const language = document.getElementById('language-select').value;
    if (language !== 'javascript') {
      outputContent.textContent = `当前只支持运行JavaScript代码\n${language}代码已复制到剪贴板`;
      this.copyCode();
      return;
    }

    const logs = [];
    const originalLog = console.log;
    const originalError = console.error;
    const originalWarn = console.warn;

    console.log = (...args) => {
      logs.push(args.map(arg => typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)).join(' '));
      originalLog.apply(console, args);
    };
    console.error = (...args) => {
      logs.push('[ERROR] ' + args.map(arg => typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)).join(' '));
      originalError.apply(console, args);
    };
    console.warn = (...args) => {
      logs.push('[WARN] ' + args.map(arg => typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)).join(' '));
      originalWarn.apply(console, args);
    };

    try {
      const result = new Function(code)();
      if (result !== undefined) {
        logs.push('返回值: ' + (typeof result === 'object' ? JSON.stringify(result, null, 2) : result));
      }
      outputContent.textContent = logs.length > 0 ? logs.join('\n') : '代码运行成功（无输出）';
      outputContent.style.color = '#5a8a64';
    } catch (error) {
      outputContent.textContent = `错误: ${error.message}\n\n${error.stack}`;
      outputContent.style.color = '#c45a5a';
    } finally {
      console.log = originalLog;
      console.error = originalError;
      console.warn = originalWarn;
    }
  }

  // ===== 设置面板 =====
  showSettings() {
    const panel = document.getElementById('settings-panel');
    panel.classList.add('show');

    const providerSelect = document.getElementById('api-provider');
    if (providerSelect) {
      providerSelect.value = this.settings.provider || 'doubao';
      this.onProviderChange(providerSelect.value, true);
    }
  }

  hideSettings() {
    document.getElementById('settings-panel').classList.remove('show');
  }

  saveSettings() {
    const provider = document.getElementById('api-provider')?.value || 'local';
    const baseUrl = document.getElementById('api-base-url')?.value?.replace(/\/+$/, '') || '';
    const apiKey = document.getElementById('api-key')?.value || '';
    const model = provider === 'custom'
      ? document.getElementById('custom-model-input')?.value || ''
      : document.getElementById('model-select')?.value || '';

    this.settings = {
      provider,
      baseUrl,
      apiKey,
      model,
      customModel: provider === 'custom' ? model : '',
      alwaysOnTop: document.getElementById('always-on-top')?.checked ?? true,
      opacity: parseInt(document.getElementById('opacity-slider')?.value || '95'),
    };

    localStorage.setItem('megumi-pet-settings', JSON.stringify(this.settings));
    this.applySettings();
    this.hideSettings();
    this.showToast('设置已保存');
  }

  loadSettings() {
    const defaults = {
      provider: 'local',
      baseUrl: 'http://localhost:11434/v1',
      apiKey: '',
      model: 'qwen3:8b',
      customModel: '',
      alwaysOnTop: true,
      opacity: 95,
    };
    try {
      const saved = localStorage.getItem('megumi-pet-settings');
      return saved ? { ...defaults, ...JSON.parse(saved) } : defaults;
    } catch (error) {
      return defaults;
    }
  }

  applySettings() {
    const provider = window.getProvider(this.settings.provider);
    const baseUrl = this.settings.baseUrl || provider?.baseUrl || '';
    const model = this.settings.model;

    window.mimoAPI.setProvider(this.settings.provider);
    window.mimoAPI.setBaseUrl(baseUrl);
    window.mimoAPI.setApiKey(this.settings.apiKey);
    window.mimoAPI.setModel(model);

    window.electronAPI.setAlwaysOnTop(this.settings.alwaysOnTop);
    document.body.style.opacity = this.settings.opacity / 100;
  }

  showLoading(show) {
    this.isLoading = show;
    document.getElementById('loading-overlay')?.classList.toggle('show', show);
    const sendBtn = document.getElementById('btn-chat-send');
    if (sendBtn) sendBtn.disabled = show;
  }

  showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2500);
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // 切换显示模式
  async toggleDisplayMode() {
    const newMode = await window.live2dManager.toggleDisplayMode();
    const modeText = newMode === 'gif' ? 'GIF图像模式' : '网页模式';
    this.showToast(`已切换到${modeText}`);
    this.updateModeButton(newMode);
  }

  // 更新切换按钮的显示
  updateModeButton(mode) {
    const btn = document.getElementById('btn-toggle-mode');
    if (btn) {
      btn.title = mode === 'gif' ? '切换到网页模式' : '切换到GIF图像模式';
    }
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  window.app = new App();
});
