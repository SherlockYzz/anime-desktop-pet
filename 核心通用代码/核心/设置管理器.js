// 二次元桌宠 - 设置管理器
// 负责设置加载/保存、API提供商切换、连接测试
class SettingsManager {
  constructor(app) {
    this.app = app;
    this.settings = this.load();
    this._bindPromptEvents();
  }

  _bindPromptEvents() {
    // 角色选择切换 → 加载对应提示词
    document.addEventListener('change', (e) => {
      if (e.target.id === 'prompt-character-select') {
        this._updatePromptEditor();
      }
    });

    // 保存提示词
    document.addEventListener('click', (e) => {
      if (e.target.id === 'btn-prompt-save') {
        this._savePrompt();
      }
    });

    // 恢复默认
    document.addEventListener('click', (e) => {
      if (e.target.id === 'btn-prompt-reset') {
        this._resetPrompt();
      }
    });

    // 删除自定义角色
    document.addEventListener('click', (e) => {
      if (e.target.id === 'btn-delete-character') {
        this._deleteCharacter();
      }
    });

    // 导出角色
    document.addEventListener('click', (e) => {
      if (e.target.id === 'btn-export-character') {
        const charSelect = document.getElementById('prompt-character-select');
        if (charSelect) window.customCharManager?.exportCharacter(charSelect.value);
      }
    });

    // ★ 原作台词集管理事件
    this._bindCanonicalEvents();
  }

  /** 绑定原作台词集管理的所有事件 */
  _bindCanonicalEvents() {
    // 添加台词
    document.addEventListener('click', (e) => {
      if (e.target.id === 'btn-canonical-add') {
        this._addCanonicalLine();
      }
    });

    // 输入框回车添加
    document.addEventListener('keydown', (e) => {
      if (e.target.id === 'canonical-input' && e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this._addCanonicalLine();
      }
    });

    // 删除单条台词（事件委托）
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('canonical-item-delete')) {
        const index = parseInt(e.target.dataset.index, 10);
        if (!isNaN(index)) this._removeCanonicalLine(index);
      }
    });

    // 编辑单条台词（事件委托）
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('canonical-item-edit')) {
        const index = parseInt(e.target.dataset.index, 10);
        if (!isNaN(index)) this._editCanonicalLine(index);
      }
    });

    // 批量导入按钮
    document.addEventListener('click', (e) => {
      if (e.target.id === 'btn-canonical-import') {
        document.getElementById('canonical-file-input')?.click();
      }
    });

    // 恢复默认原作台词集
    document.addEventListener('click', (e) => {
      if (e.target.id === 'btn-canonical-reset') {
        this._resetCanonical();
      }
    });

    // 文件选择
    document.addEventListener('change', (e) => {
      if (e.target.id === 'canonical-file-input') {
        this._importCanonicalFile(e.target.files);
        e.target.value = '';
      }
    });

    // 角色切换时刷新台词列表
    document.addEventListener('change', (e) => {
      if (e.target.id === 'prompt-character-select') {
        this._refreshCanonicalList();
      }
    });
  }

  /** 添加一句原作台词 */
  _addCanonicalLine() {
    const input = document.getElementById('canonical-input');
    if (!input) return;
    const text = input.value.trim();
    if (!text) return;

    // 支持多行粘贴：按行拆分，每行一句
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    const charSelect = document.getElementById('prompt-character-select');
    const characterId = charSelect?.value || window.characterManager.currentCharacterId;
    if (!characterId) return;

    // 确保操作的是正确的角色
    const prevId = window.characterManager.currentCharacterId;
    const isCurrentChar = characterId === prevId;

    lines.forEach(line => {
      if (isCurrentChar) {
        window.characterManager.addCanonicalLine(line);
      } else {
        // 非当前角色：直接操作注册表数据
        const char = window.characterManager.registry[characterId];
        if (char) {
          if (!char.lines._canonical) char.lines._canonical = [];
          char.lines._canonical.push(line);
        }
      }
    });

    // 非当前角色需要手动保存
    if (!isCurrentChar) {
      const char = window.characterManager.registry[characterId];
      if (char?.lines?._canonical && window.electronAPI?.saveCanonicalLines) {
        const f = CHARACTER_FOLDER_MAP[characterId];
        if (f) window.electronAPI.saveCanonicalLines(f, char.lines._canonical);
      }
    }

    input.value = '';
    this._refreshCanonicalList();
    this.app.showToast(`已添加 ${lines.length} 句台词`);
  }

  /** 删除单条原作台词 */
  _removeCanonicalLine(index) {
    const charSelect = document.getElementById('prompt-character-select');
    const characterId = charSelect?.value || window.characterManager.currentCharacterId;
    if (!characterId) return;

    if (characterId === window.characterManager.currentCharacterId) {
      window.characterManager.removeCanonicalLine(index);
    } else {
      const char = window.characterManager.registry[characterId];
      if (char?.lines?._canonical) {
        char.lines._canonical.splice(index, 1);
        // 保存
        const f = CHARACTER_FOLDER_MAP[characterId];
        if (f && window.electronAPI?.saveCanonicalLines) {
          window.electronAPI.saveCanonicalLines(f, char.lines._canonical);
        }
      }
    }

    this._refreshCanonicalList();
  }

  /** 编辑单条原作台词 */
  _editCanonicalLine(index) {
    const charSelect = document.getElementById('prompt-character-select');
    const characterId = charSelect?.value || window.characterManager.currentCharacterId;
    if (!characterId) return;

    // 获取当前台词内容
    let lines = [];
    if (characterId === window.characterManager.currentCharacterId) {
      lines = window.characterManager.getCanonicalLines();
    } else {
      const char = window.characterManager.registry[characterId];
      lines = char?.lines?._canonical || [];
    }

    if (index < 0 || index >= lines.length) return;

    const currentLine = lines[index];
    const newLine = prompt('编辑台词：', currentLine);

    // 用户点击取消或内容未变化
    if (newLine === null || newLine === currentLine) return;

    const trimmedLine = newLine.trim();
    if (!trimmedLine) {
      this.app.showToast('台词内容不能为空');
      return;
    }

    // 更新台词
    if (characterId === window.characterManager.currentCharacterId) {
      window.characterManager.updateCanonicalLine(index, trimmedLine);
    } else {
      const char = window.characterManager.registry[characterId];
      if (char?.lines?._canonical) {
        char.lines._canonical[index] = trimmedLine;
        // 保存
        const f = CHARACTER_FOLDER_MAP[characterId];
        if (f && window.electronAPI?.saveCanonicalLines) {
          window.electronAPI.saveCanonicalLines(f, char.lines._canonical);
        }
      }
    }

    this._refreshCanonicalList();
    this.app.showToast('台词已更新');
  }

  /** 从文件批量导入原作台词 */
  _importCanonicalFile(files) {
    if (!files || files.length === 0) return;
    const file = files[0];
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
      if (lines.length === 0) {
        this.app.showToast('文件为空或无有效台词');
        return;
      }

      const charSelect = document.getElementById('prompt-character-select');
      const characterId = charSelect?.value || window.characterManager.currentCharacterId;
      if (!characterId) return;

      const isCurrentChar = characterId === window.characterManager.currentCharacterId;
      lines.forEach(line => {
        if (isCurrentChar) {
          window.characterManager.addCanonicalLine(line);
        } else {
          const char = window.characterManager.registry[characterId];
          if (char) {
            if (!char.lines._canonical) char.lines._canonical = [];
            char.lines._canonical.push(line);
          }
        }
      });

      if (!isCurrentChar) {
        const f = CHARACTER_FOLDER_MAP[characterId];
        const char = window.characterManager.registry[characterId];
        if (f && char?.lines?._canonical && window.electronAPI?.saveCanonicalLines) {
          window.electronAPI.saveCanonicalLines(f, char.lines._canonical);
        }
      }

      this._refreshCanonicalList();
      this.app.showToast(`已导入 ${lines.length} 句台词`);
    };
    reader.readAsText(file);
  }

  /** 恢复默认原作台词集（从文件重新加载） */
  async _resetCanonical() {
    const charSelect = document.getElementById('prompt-character-select');
    const characterId = charSelect?.value || window.characterManager.currentCharacterId;
    if (!characterId) return;

    const character = window.characterManager.registry[characterId];
    if (!character) return;

    const charName = character.name || characterId;

    if (character.isCustom) {
      // 自定义角色：从自定义角色文件夹重新加载
      try {
        const canonPath = `../../自定义角色/${characterId}/原作台词集.txt`;
        const resp = await fetch(canonPath);
        if (resp.ok) {
          const text = await resp.text();
          const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
          character.lines._canonical = lines;
        } else {
          character.lines._canonical = [];
        }
      } catch {
        character.lines._canonical = [];
      }
    } else {
      // 内建角色：从角色文件夹重新加载
      const folder = CHARACTER_FOLDER_MAP[characterId];
      if (!folder) return;
      try {
        const canonPath = `../../${folder}/原作台词集.txt`;
        const resp = await fetch(canonPath);
        if (resp.ok) {
          const text = await resp.text();
          const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
          character.lines._canonical = lines;
        } else {
          character.lines._canonical = [];
        }
      } catch {
        character.lines._canonical = [];
      }
      // 同时清除台词缓存，确保下次启动也用最新文件
      localStorage.removeItem(`dialogue_cache_${characterId}`);
    }

    this._refreshCanonicalList();
    this.app.showToast(`「${charName}」原作台词集已恢复默认`);
  }

  /** 刷新原作台词列表显示 */
  _refreshCanonicalList() {
    const listEl = document.getElementById('canonical-list');
    const countEl = document.getElementById('canonical-count');
    if (!listEl) return;

    const charSelect = document.getElementById('prompt-character-select');
    const characterId = charSelect?.value || window.characterManager.currentCharacterId;
    if (!characterId) {
      listEl.innerHTML = '<div class="canonical-empty">请先选择角色</div>';
      if (countEl) countEl.textContent = '0';
      return;
    }

    let lines = [];
    if (characterId === window.characterManager.currentCharacterId) {
      lines = window.characterManager.getCanonicalLines();
    } else {
      const char = window.characterManager.registry[characterId];
      lines = char?.lines?._canonical || [];
    }

    if (countEl) countEl.textContent = lines.length;

    if (lines.length === 0) {
      listEl.innerHTML = '<div class="canonical-empty">暂无原作台词，点击上方添加</div>';
      return;
    }

    listEl.innerHTML = lines.map((line, i) =>
      `<div class="canonical-item">
        <span class="canonical-item-text">${escapeHtml(line)}</span>
        <button class="canonical-item-edit" data-index="${i}" title="编辑此句">&#9998;</button>
        <button class="canonical-item-delete" data-index="${i}" title="删除此句">&times;</button>
      </div>`
    ).join('');
  }

  // escapeHtml 已在 工具函数.js 中全局定义

  /** 删除自定义角色 */
  async _deleteCharacter() {
    const charSelect = document.getElementById('prompt-character-select');
    const characterId = charSelect?.value;
    if (!characterId) return;

    const character = window.characterManager.registry[characterId];
    if (!character || !character.isCustom) return;

    if (!confirm(`确定要删除角色「${character.name}」吗？\n此操作不可撤销。`)) return;

    try {
      await window.electronAPI.deleteCustomCharacter(characterId);

      // 从注册表移除
      delete window.CHARACTER_REGISTRY[characterId];

      // 如果删除的是当前角色，切换到第一个可用角色
      if (window.characterManager.currentCharacterId === characterId) {
        const remaining = window.characterManager.getAllCharacters();
        if (remaining.length > 0) {
          await window.app._switchCharacter(remaining[0].id);
        }
      }

      // 刷新角色选择器
      window.app._initCharacterSelector?.();

      // 刷新设置面板的角色下拉
      const sel = document.getElementById('prompt-character-select');
      if (sel) {
        sel.dataset.populated = '';
        this._populateCharacterSelect();
      }

      // 隐藏删除按钮区域
      const actions = document.getElementById('setting-custom-char-actions');
      if (actions) actions.style.display = 'none';

      this.app.showToast(`角色「${character.name}」已删除`);
    } catch (e) {
      this.app.showToast(`删除失败: ${e.message}`);
    }
  }

  _savePrompt() {
    const charSelect = document.getElementById('prompt-character-select');
    const editor = document.getElementById('prompt-editor');
    const status = document.getElementById('prompt-status');
    if (!charSelect || !editor) return;

    const characterId = charSelect.value;
    const promptText = editor.value;

    window.characterManager.setCustomPrompt(characterId, promptText);

    // ★ 如果当前正在使用的是这个角色，立即应用新提示词
    const currentId = window.characterManager.currentCharacterId;
    if (currentId === characterId) {
      // systemPrompt 已经在 setCustomPrompt 里更新了，清空API对话历史
    }

    if (status) {
      status.textContent = promptText.trim() ? '✓ 已保存并立即生效' : '✓ 已恢复为默认设定';
      status.className = 'prompt-status success';
    }
    this.app.showToast(`「${window.characterManager.registry[characterId]?.name || characterId}」提示词已更新`);
  }

  async _resetPrompt() {
    const charSelect = document.getElementById('prompt-character-select');
    const editor = document.getElementById('prompt-editor');
    const status = document.getElementById('prompt-status');
    if (!charSelect || !editor) return;

    const characterId = charSelect.value;
    const character = window.characterManager.registry[characterId];
    if (!character) return;

    // 删除自定义提示词 + 等待文件重载完成
    await window.characterManager.deleteCustomPrompt(characterId);

    // 编辑器恢复为默认提示词（此时 systemPrompt 已从文件重新加载）
    editor.value = character.systemPrompt || '';

    if (status) {
      status.textContent = '✓ 已恢复默认设定';
      status.className = 'prompt-status success';
    }
    this.app.showToast('已恢复默认提示词');
  }

  // === 默认设置 ===
  static DEFAULTS = {
    provider: 'local',
    baseUrl: 'http://localhost:11434/v1',
    apiKey: '',
    model: 'qwen3:8b',
    customModel: '',
    promptMode: 'auto',
    responseMode: 'instant',
    alwaysOnTop: true,
    opacity: 95,
  };

  // ★ 动态填充角色选择下拉（从注册表读取，避免硬编码遗漏）
  _populateCharacterSelect() {
    const sel = document.getElementById('prompt-character-select');
    if (!sel || sel.dataset.populated) return;
    const list = window.characterManager.getAllCharacters();
    sel.innerHTML = '';
    list.forEach(char => {
      const o = document.createElement('option');
      o.value = char.id;
      o.textContent = char.name;
      sel.appendChild(o);
    });
    sel.dataset.populated = 'true';
  }

  initProviderSelector() {
    const sel = document.getElementById('api-provider');
    if (!sel) return;
    const list = window.getProviderList();
    sel.innerHTML = '';
    list.forEach(p => {
      const o = document.createElement('option');
      o.value = p.id; o.textContent = p.name; sel.appendChild(o);
    });
    sel.value = this.settings.provider || 'local';
    this.onProviderChange(sel.value, true);

    this._populateCharacterSelect();

    // ★ 自动保存：任何输入/选择变更都自动保存
    this._bindAutoSave();
  }

  /** 绑定自动保存事件 */
  _bindAutoSave() {
    const autoSaveIds = [
      'api-provider', 'api-base-url', 'api-key', 'model-select',
      'custom-model-input', 'prompt-mode', 'response-mode',
      'always-on-top', 'opacity-slider',
    ];
    const debounceSave = debounce(() => {
      this.save();
      // 静默保存，不弹 Toast
    }, 800);

    autoSaveIds.forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      const eventType = el.type === 'checkbox' || el.type === 'range' ? 'input' : 'change';
      el.addEventListener(eventType, debounceSave);
    });
  }

  // debounce 已在 工具函数.js 中全局定义

  onProviderChange(providerId, skipRestore) {
    const p = window.getProvider(providerId);
    if (!p) return;
    const descEl = document.getElementById('provider-description');
    if (descEl) descEl.textContent = p.description;

    const modelSel = document.getElementById('model-select');
    const customDiv = document.getElementById('setting-custom-model');
    const modelDiv = document.getElementById('setting-model');

    if (providerId === 'custom') {
      if (modelDiv) modelDiv.style.display = 'none';
      if (customDiv) customDiv.style.display = 'block';
      const inp = document.getElementById('custom-model-input');
      if (inp) inp.value = skipRestore ? (this.settings.customModel || '') : '';
    } else {
      if (modelDiv) modelDiv.style.display = 'block';
      if (customDiv) customDiv.style.display = 'none';
      if (modelSel) {
        modelSel.innerHTML = '';
        p.models.forEach(m => {
          const o = document.createElement('option');
          o.value = m.id; o.textContent = m.name; modelSel.appendChild(o);
        });
        modelSel.value = skipRestore ? (this.settings.model || p.models[0]?.id || '') : (p.models[0]?.id || '');
      }
    }

    const urlInput = document.getElementById('api-base-url');
    if (urlInput) {
      urlInput.readOnly = providerId !== 'custom';
      urlInput.value = skipRestore
        ? (this.settings.baseUrl || p.baseUrl || '')
        : (p.baseUrl || '');
    }

    const keyDiv = document.getElementById('setting-api-key');
    if (keyDiv) {
      keyDiv.style.display = 'block';
      const keyInput = document.getElementById('api-key');
      if (keyInput) {
        keyInput.placeholder = p.needsKey ? '输入你的API Key' : '本地模型无需API Key';
        keyInput.disabled = !p.needsKey;
        if (skipRestore) keyInput.value = this.settings.apiKey || '';
      }
    }

    const tr = document.getElementById('test-result');
    if (tr) { tr.className = 'test-result'; tr.textContent = ''; }
  }

  show() {
    const panel = document.getElementById('settings-panel');
    if (!panel) return;
    panel.classList.add('show');
    const sel = document.getElementById('api-provider');
    if (sel) { sel.value = this.settings.provider || 'local'; this.onProviderChange(sel.value, true); }
    // 恢复下拉选项
    const pm = document.getElementById('prompt-mode');
    if (pm) pm.value = this.settings.promptMode || 'auto';
    const rm = document.getElementById('response-mode');
    if (rm) rm.value = this.settings.responseMode || 'instant';

    // ★ 加载当前角色的提示词到编辑器
    this._loadPromptEditor();
    // ★ 刷新原作台词列表
    this._refreshCanonicalList();
  }

  // ★ 加载提示词编辑器内容
  async _loadPromptEditor() {
    const charSelect = document.getElementById('prompt-character-select');
    const editor = document.getElementById('prompt-editor');
    const status = document.getElementById('prompt-status');
    if (!charSelect || !editor) return;

    // 默认选中当前角色
    const currentId = window.characterManager.currentCharacterId;
    if (currentId && [...charSelect.options].some(o => o.value === currentId)) {
      charSelect.value = currentId;
    }

    const characterId = charSelect.value;
    // ★ 没有自定义提示词时，从文件重新加载确保不是旧缓存
    if (characterId && !window.characterManager.getCustomPrompt(characterId)) {
      const character = window.characterManager.registry[characterId];
      if (character && !character.isCustom) {
        character._defaultSystemPrompt = null;
        await window.characterManager.loadCharacterSystemPromptOnly(characterId);
      }
    }

    this._updatePromptEditor();
  }

  _updatePromptEditor() {
    const editor = document.getElementById('prompt-editor');
    const status = document.getElementById('prompt-status');
    if (!editor) return;

    const charSelect = document.getElementById('prompt-character-select');
    const characterId = charSelect?.value || window.characterManager.currentCharacterId;
    if (!characterId) return;

    const character = window.characterManager.registry[characterId];
    if (!character) return;

    // ★ 优先显示自定义提示词，否则显示当前加载的提示词
    const customPrompt = window.characterManager.getCustomPrompt(characterId);
    if (customPrompt) {
      editor.value = customPrompt;
    } else if (character.systemPrompt) {
      editor.value = character.systemPrompt;
    } else {
      editor.value = '';
    }

    if (status) {
      const hasCustom = !!window.characterManager.getCustomPrompt(characterId);
      status.textContent = hasCustom ? '✓ 已使用自定义设定' : '';
      status.className = 'prompt-status' + (hasCustom ? ' success' : '');
    }

    // ★ 显示/隐藏"删除此角色"按钮（仅自定义角色显示）
    const customActions = document.getElementById('setting-custom-char-actions');
    if (customActions) {
      customActions.style.display = character.isCustom ? 'block' : 'none';
    }
  }

  hide() {
    document.getElementById('settings-panel')?.classList.remove('show');
  }

  save() {
    const provider = document.getElementById('api-provider')?.value || 'local';
    const baseUrl = (document.getElementById('api-base-url')?.value || '').replace(/\/+$/, '');
    const apiKey = document.getElementById('api-key')?.value || '';
    const model = provider === 'custom'
      ? (document.getElementById('custom-model-input')?.value || '')
      : (document.getElementById('model-select')?.value || '');

    this.settings = {
      provider, baseUrl, apiKey, model,
      customModel: provider === 'custom' ? model : '',
      promptMode: document.getElementById('prompt-mode')?.value || 'auto',
      responseMode: document.getElementById('response-mode')?.value || 'instant',
      alwaysOnTop: document.getElementById('always-on-top')?.checked ?? true,
      opacity: parseInt(document.getElementById('opacity-slider')?.value || '95'),
    };

    localStorage.setItem('megumi-pet-settings', JSON.stringify(this.settings));
    this.apply();
    this.hide();
    this.app.showToast('设置已保存');
  }

  load() {
    try {
      const saved = localStorage.getItem('megumi-pet-settings');
      return saved ? { ...SettingsManager.DEFAULTS, ...JSON.parse(saved) } : { ...SettingsManager.DEFAULTS };
    } catch { return { ...SettingsManager.DEFAULTS }; }
  }

  apply() {
    const p = window.getProvider(this.settings.provider);
    const baseUrl = this.settings.baseUrl || p?.baseUrl || '';
    window.mimoAPI.setProvider(this.settings.provider);
    window.mimoAPI.setBaseUrl(baseUrl);
    window.mimoAPI.setApiKey(this.settings.apiKey);
    window.mimoAPI.setModel(this.settings.model);
    // ★ 关键修复：把响应模式真正注入 AI 接口！
    window.mimoAPI.setResponseMode(this.settings.responseMode || 'instant');
    window.mimoAPI.setPromptMode(this.settings.promptMode || 'auto');
    window.electronAPI?.setAlwaysOnTop(this.settings.alwaysOnTop);
    document.body.style.opacity = this.settings.opacity / 100;
  }

  async testConnection() {
    const btn = document.getElementById('btn-test-connection');
    const result = document.getElementById('test-result');
    if (!btn || !result) return;
    btn.disabled = true; btn.textContent = '测试中...';
    result.className = 'test-result'; result.textContent = '';

    const provider = document.getElementById('api-provider')?.value;
    const baseUrl = document.getElementById('api-base-url')?.value;
    const apiKey = document.getElementById('api-key')?.value;
    const model = provider === 'custom'
      ? document.getElementById('custom-model-input')?.value
      : document.getElementById('model-select')?.value;

    const orig = { url: window.mimoAPI.baseUrl, key: window.mimoAPI.apiKey, model: window.mimoAPI.model };
    window.mimoAPI.setBaseUrl(baseUrl); window.mimoAPI.setApiKey(apiKey); window.mimoAPI.setModel(model);

    try {
      const res = await window.mimoAPI.testConnection();
      result.className = 'test-result ' + (res.success ? 'success' : 'error');
      result.textContent = res.success ? '连接成功' : `连接失败: ${res.message}`;
    } catch (e) {
      result.className = 'test-result error';
      result.textContent = `错误: ${e.message}`;
    } finally {
      window.mimoAPI.setBaseUrl(orig.url); window.mimoAPI.setApiKey(orig.key); window.mimoAPI.setModel(orig.model);
      btn.disabled = false; btn.textContent = '测试连接';
    }
  }
}
