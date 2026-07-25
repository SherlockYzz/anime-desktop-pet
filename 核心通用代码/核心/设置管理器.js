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
  }

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

  _resetPrompt() {
    const charSelect = document.getElementById('prompt-character-select');
    const editor = document.getElementById('prompt-editor');
    const status = document.getElementById('prompt-status');
    if (!charSelect || !editor) return;

    const characterId = charSelect.value;
    const character = window.characterManager.registry[characterId];
    if (!character) return;

    // 删除自定义提示词
    window.characterManager.deleteCustomPrompt(characterId);

    // 编辑器恢复为默认提示词
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
    const debounceSave = this._debounce(() => {
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

  /** 简单 debounce */
  _debounce(fn, delay) {
    let timer = null;
    return (...args) => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => { fn.apply(this, args); timer = null; }, delay);
    };
  }

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
  }

  // ★ 加载提示词编辑器内容
  _loadPromptEditor() {
    const charSelect = document.getElementById('prompt-character-select');
    const editor = document.getElementById('prompt-editor');
    const status = document.getElementById('prompt-status');
    if (!charSelect || !editor) return;

    // 默认选中当前角色
    const currentId = window.characterManager.currentCharacterId;
    if (currentId && [...charSelect.options].some(o => o.value === currentId)) {
      charSelect.value = currentId;
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
