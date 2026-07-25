// ========================================
//  二次元桌宠 - 自定义角色管理器
//  管理用户自创角色：创建、删除、主题生成
// ========================================

class CustomCharacterManager {
  constructor() {
    this._customRegistry = {};
    this._loaded = false;
    this._loadPromise = null;
  }

  /** 从磁盘加载自定义角色到 CHARACTER_REGISTRY（需在 CharacterManager 前调用） */
  async loadCustomCharacters() {
    if (this._loadPromise) return this._loadPromise;
    this._loadPromise = this._doLoad();
    return this._loadPromise;
  }

  async _doLoad() {
    if (!window.electronAPI) {
      console.warn('[CustomChar] electronAPI不可用，跳过自定义角色');
      this._loaded = true;
      return;
    }

    try {
      const registry = await window.electronAPI.getCustomCharacters();
      this._customRegistry = registry;

      for (const [id, data] of Object.entries(registry)) {
        const theme = this._generateTheme(data.primaryColor || '#f0a0b0');
        window.CHARACTER_REGISTRY[id] = {
          id,
          name: data.name,
          nameJa: '',
          series: data.series || '自定义角色',
          seriesJa: '',
          cv: '',
          birthday: null,
          tagline: data.tagline || '',
          description: data.description || '',
          avatar: data.avatar,
          cover: data.cover || data.avatar,
          theme,
          live2d: {
            fallbackImage: data.cover || data.avatar,
            modelPath: data.live2dModelPath || '',
          },
          systemPrompt: data.systemPrompt || null,
          lines: {},
          isCustom: true,
          _defaultSystemPrompt: data.systemPrompt || '',
        };
      }
      this._loaded = true;
    } catch (e) {
      console.warn('[CustomChar] 加载自定义角色失败:', e);
      this._loaded = true;
    }
  }

  // ============ 主题生成 ============

  /** 从主色自动生成全套粉彩主题 */
  _generateTheme(hexColor) {
    const { h, s, l } = this._hexToHsl(hexColor);
    // 降低饱和度到粉彩范围
    const S = Math.max(18, Math.min(50, s * 0.7));
    const L = 70 + (l - 50) * 0.2; // 提亮

    const hsl = (hue, sat, lig, a) => {
      const hh = typeof hue === 'number' ? ((hue % 360) + 360) % 360 : h;
      const ss = sat ?? S;
      const ll = lig ?? L;
      return a != null ? `hsla(${hh}, ${ss}%, ${ll}%, ${a})` : `hsl(${hh}, ${ss}%, ${ll}%)`;
    };
    const rgba = (r, g, b, a) => `rgba(${r},${g},${b},${a})`;

    // 实际颜色值
    const pH = h;                    // 主色相
    const pS = S;                    // 主饱和度
    const pL = L;                    // 主明度
    const pS2 = S + 5;
    const pL2 = L - 5;

    // RGB主色（用于计算透明变体）
    const pr = Math.round(this._hueToRgb(pH, pS / 100, pL / 100));
    const pg = Math.round(this._hueToRgb(pH + 120, pS / 100, pL / 100));
    const pb = Math.round(this._hueToRgb(pH + 240, pS / 100, pL / 100));

    return {
      primary: hsl(pH, pS, pL),
      secondary: hsl(pH - 10, pS2, pL + 5),
      accent: hsl(pH + 10, pS2 - 5, pL + 8),
      bg: hsl(pH, pS - 10, 96, 0.94),
      bgLight: hsl(pH, pS - 5, 93, 0.9),
      text: hsl(pH, pS - 15, 25),
      textSecondary: hsl(pH, pS - 10, 50, 0.6),
      border: hsl(pH, pS + 5, 75, 0.25),
      hoverColor: hsl(pH, pS, 80, 0.25),
      shadowColor: hsl(pH, pS, 70, 0.15),
      glowColor: hsl(pH, pS, 75, 0.35),
      gradient: `linear-gradient(135deg, ${hsl(pH, pS, pL)}, ${hsl(pH - 20, pS + 5, pL - 5)})`,
      gradientSoft: `linear-gradient(135deg, ${hsl(pH - 10, pS2, pL + 5)}, ${hsl(pH, pS, pL)})`,
      gradientBg: `linear-gradient(180deg, ${hsl(pH, pS - 5, 96, 0.97)}, ${hsl(pH, pS - 3, 93, 0.95)})`,
      gradientTitlebar: `linear-gradient(135deg, ${hsl(pH, pS, 90, 1)}, ${hsl(pH - 15, pS - 5, 86, 1)}, ${hsl(pH + 15, pS - 10, 88, 1)})`,
      titleText: hsl(pH, pS - 10, 40),
      scrollbarThumb: hsl(pH, pS, 75, 0.25),
      scrollbarHover: hsl(pH, pS, 75, 0.4),
      btnSendShadow: hsl(pH, pS, 70, 0.3),
      btnSendHoverShadow: hsl(pH, pS, 70, 0.45),
      toastBg: `linear-gradient(135deg, ${hsl(pH, pS, pL, 0.9)}, ${hsl(pH - 20, pS + 10, pL, 0.85)})`,
      toastShadow: hsl(pH, pS, 70, 0.35),
      codeBg: hsl(pH, 10, 18, 0.95),
      codeText: hsl(pH, 10, 82),
      codeLineNum: hsl(pH, pS, 75, 0.3),
      codePlaceholder: hsl(pH, pS, 75, 0.25),
      settingsBg: hsl(pH, pS - 5, 90, 0.35),
      inputBg: hsl(0, 0, 100, 0.55),
      inputBorder: hsl(pH, pS, 78, 0.2),
      inputFocusShadow: hsl(pH, pS, 78, 0.15),
      live2dBgStart: hsl(pH, pS - 10, 92, 0.6),
      live2dBgEnd: hsl(pH, pS - 5, 88, 0.3),
      live2dFade: hsl(pH, pS - 10, 96, 0.8),
      moodColor: hsl(pH, pS - 10, 50, 0.4),
      tabActiveBg: `linear-gradient(135deg, ${hsl(pH, pS, 80, 0.3)}, ${hsl(pH + 20, pS - 5, 82, 0.2)})`,
      tabActiveColor: hsl(pH, pS - 10, 35),
      messageAiBg: hsl(0, 0, 100, 0.65),
      messageUserBg: `linear-gradient(135deg, ${hsl(pH, pS, 88, 0.5)}, ${hsl(pH + 15, pS - 5, 85, 0.4)})`,
      avatarAiBorder: hsl(pH, pS, 75, 0.3),
      avatarAiBg: hsl(pH, pS, 80, 0.15),
      avatarUserBg: hsl(pH + 30, pS - 10, 85, 0.2),
      avatarUserBorder: hsl(pH + 30, pS - 10, 78, 0.3),
      codeInlineBg: hsl(pH, pS, 80, 0.12),
      codeInlineColor: hsl(pH, pS - 10, 40),
      preBg: hsl(pH, 5, 92, 0.06),
      preBorder: hsl(pH, pS, 80, 0.12),
      closeHoverBg: hsl(pH, 70, 65, 0.6),
      optionBg: hsl(pH, pS - 5, 96),
      rangeBg: hsl(pH, pS, 78, 0.2),
      rangeThumbShadow: hsl(pH, pS, 75, 0.4),
      cardHoverShadow: hsl(pH, pS, 70, 0.15),
      cardHoverBorder: hsl(pH, pS, 75, 0.3),
      cardActiveShadow: hsl(pH, pS, 72, 0.2),
      loadingBg: hsl(pH, pS - 5, 92, 0.8),
      loadingBorder: hsl(pH, pS, 78, 0.2),
      loadingShadow: hsl(pH, pS, 75, 0.15),
    };
  }

  // ============ 颜色工具 ============

  _hexToHsl(hex) {
    let r = 0, g = 0, b = 0;
    if (hex) {
      const h = hex.replace('#', '');
      r = parseInt(h.substring(0, 2), 16) / 255;
      g = parseInt(h.substring(2, 4), 16) / 255;
      b = parseInt(h.substring(4, 6), 16) / 255;
    }
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0, s, l = (max + min) / 2;
    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
        case g: h = ((b - r) / d + 2) / 6; break;
        case b: h = ((r - g) / d + 4) / 6; break;
      }
    }
    return { h: Math.round(h * 360), s: Math.round((s || 0) * 100), l: Math.round(l * 100) };
  }

  _hueToRgb(hue, sat, lig) {
    // Helper - returns a single R/G/B component from HSL
    const h = ((hue % 360) + 360) % 360 / 360;
    const c = (1 - Math.abs(2 * lig - 1)) * sat;
    const x = c * (1 - Math.abs((h * 6) % 2 - 1));
    const m = lig - c / 2;
    let r = m, g = m, b = m;
    if (h < 1 / 6) { r += c; g += x; }
    else if (h < 2 / 6) { r += x; g += c; }
    else if (h < 3 / 6) { g += c; b += x; }
    else if (h < 4 / 6) { g += x; b += c; }
    else if (h < 5 / 6) { r += x; b += c; }
    else { r += c; b += x; }
    return Math.round(Math.max(0, Math.min(255, (r + m) * 255)));
  }

  // ============ UI 面板 ============

  showCreatePanel() {
    const panel = document.getElementById('create-character-panel');
    if (panel) panel.classList.add('show');
  }

  hideCreatePanel() {
    const panel = document.getElementById('create-character-panel');
    if (panel) panel.classList.remove('show');
    this._resetForm();
  }

  _resetForm() {
    const ids = ['cc-name', 'cc-series', 'cc-tagline', 'cc-description', 'cc-prompt'];
    ids.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
    document.getElementById('cc-color').value = '#f0a0b0';
    document.getElementById('cc-avatar-preview').innerHTML = '<span class="cc-upload-placeholder">点击上传</span>';
    document.getElementById('cc-cover-preview').innerHTML = '<span class="cc-upload-placeholder">点击上传</span>';
    document.getElementById('cc-live2d-label').textContent = '选择 model3.json 文件';
    this._avatarBase64 = null;
    this._coverBase64 = null;
    this._live2dBase64 = null;
    this._live2dFileName = null;
    const status = document.getElementById('cc-status');
    if (status) { status.textContent = ''; status.className = 'cc-status'; }
  }

  async _handleCreate() {
    const name = document.getElementById('cc-name')?.value.trim();
    const series = document.getElementById('cc-series')?.value.trim();
    const tagline = document.getElementById('cc-tagline')?.value.trim();
    const description = document.getElementById('cc-description')?.value.trim();
    const systemPrompt = document.getElementById('cc-prompt')?.value.trim();
    const primaryColor = document.getElementById('cc-color')?.value || '#f0a0b0';
    const status = document.getElementById('cc-status');

    // 验证必填字段
    if (!name) { this._showStatus(status, '请输入角色名称', 'error'); return; }
    if (!series) { this._showStatus(status, '请输入作品出处', 'error'); return; }
    if (!systemPrompt) { this._showStatus(status, '请输入系统提示词', 'error'); return; }
    if (!this._avatarBase64) { this._showStatus(status, '请上传角色头像', 'error'); return; }

    // 检查electronAPI
    if (!window.electronAPI) {
      this._showStatus(status, '文件系统不可用（非桌面环境）', 'error');
      return;
    }

    const saveBtn = document.getElementById('btn-cc-save');
    if (saveBtn) { saveBtn.disabled = true; saveBtn.textContent = '创建中...'; }

    try {
      const result = await window.electronAPI.saveCustomCharacter({
        name, series, tagline, description, systemPrompt, primaryColor,
        avatarBase64: this._avatarBase64,
        coverBase64: this._coverBase64,
        live2dModelBase64: this._live2dBase64,
        live2dModelFileName: this._live2dFileName,
      });

      if (result.success) {
        // 重新加载自定义角色
        await this.loadCustomCharacters();
        this._showStatus(status, `角色「${name}」创建成功！`, 'success');
        this.hideCreatePanel();
        window.app?.showToast(`角色「${name}」已创建`);

        // 刷新角色选择器
        if (window.characterManager && window.app) {
          window.characterManager._initCharacterSelector?.();
          window.app._initCharacterSelector?.();
        }
        // 刷新提示词编辑器角色下拉
        const promptSelect = document.getElementById('prompt-character-select');
        if (promptSelect) promptSelect.dataset.populated = '';
      } else {
        this._showStatus(status, '创建失败，请重试', 'error');
      }
    } catch (e) {
      this._showStatus(status, `创建失败: ${e.message}`, 'error');
    } finally {
      if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = '创建角色'; }
    }
  }

  _showStatus(el, text, type) {
    if (!el) return;
    el.textContent = text;
    el.className = 'cc-status ' + type;
  }

  // ============ 导出 / 导入 ============

  /** 导出角色为可分享的 JSON 文件 */
  async exportCharacter(characterId) {
    if (!window.electronAPI) {
      window.app?.showToast('导出功能仅在桌面环境中可用');
      return;
    }
    const char = window.characterManager.registry[characterId];
    if (!char) return;
    if (!char.isCustom) {
      window.app?.showToast('只能导出自定义角色');
      return;
    }
    try {
      const result = await window.electronAPI.exportCustomCharacter(characterId);
      if (result.success) {
        window.app?.showToast(`角色「${char.name}」已导出`);
      } else if (result.message !== '取消导出') {
        window.app?.showToast(`导出失败: ${result.message}`);
      }
    } catch (e) {
      window.app?.showToast(`导出失败: ${e.message}`);
    }
  }

  /** 从 JSON 文件导入角色 */
  async importCharacter() {
    if (!window.electronAPI) {
      window.app?.showToast('导入功能仅在桌面环境中可用');
      return;
    }
    try {
      const result = await window.electronAPI.importCustomCharacter();
      if (result.success) {
        await this.loadCustomCharacters();
        window.app?.showToast(`角色「${result.name}」已导入`);
        if (window.characterManager && window.app) {
          window.characterManager._initCharacterSelector?.();
          window.app._initCharacterSelector?.();
        }
        // 刷新提示词编辑器角色下拉
        const promptSelect = document.getElementById('prompt-character-select');
        if (promptSelect) promptSelect.dataset.populated = '';
      } else if (result.message !== '取消导入') {
        window.app?.showToast(`导入失败: ${result.message}`);
      }
    } catch (e) {
      window.app?.showToast(`导入失败: ${e.message}`);
    }
  }

  _bindEvents() {
    // 关闭按钮
    document.getElementById('btn-close-create-character')?.addEventListener('click', () => this.hideCreatePanel());

    // 取消按钮
    document.getElementById('btn-cc-cancel')?.addEventListener('click', () => this.hideCreatePanel());

    // 保存按钮
    document.getElementById('btn-cc-save')?.addEventListener('click', () => this._handleCreate());

    // 导入角色
    document.getElementById('btn-import-character')?.addEventListener('click', () => this.importCharacter());

    // 头像上传
    this._bindImageUpload('cc-avatar-upload', 'cc-avatar-input', 'cc-avatar-preview', (base64) => {
      this._avatarBase64 = base64;
    });

    // 封面上传
    this._bindImageUpload('cc-cover-upload', 'cc-cover-input', 'cc-cover-preview', (base64) => {
      this._coverBase64 = base64;
    });

    // Live2D模型上传
    const live2dUpload = document.getElementById('cc-live2d-upload');
    const live2dInput = document.getElementById('cc-live2d-input');
    const live2dLabel = document.getElementById('cc-live2d-label');
    if (live2dUpload && live2dInput) {
      live2dUpload.addEventListener('click', () => live2dInput.click());
      live2dInput.addEventListener('change', (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (!file.name.endsWith('.model3.json') && !file.name.endsWith('.zip')) {
          this._showStatus(document.getElementById('cc-status'), '请选择 .model3.json 或 .zip 文件', 'error');
          return;
        }
        const reader = new FileReader();
        reader.onload = (ev) => {
          this._live2dBase64 = ev.target.result;
          this._live2dFileName = file.name;
          if (live2dLabel) live2dLabel.textContent = '✓ ' + file.name;
        };
        reader.readAsDataURL(file);
      });
    }

    // 关闭面板时重置表单
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('create-character-panel') && e.target.id === 'create-character-panel') {
        this.hideCreatePanel();
      }
    });
  }

  _bindImageUpload(uploadId, inputId, previewId, onData) {
    const upload = document.getElementById(uploadId);
    const input = document.getElementById(inputId);
    const preview = document.getElementById(previewId);
    if (!upload || !input || !preview) return;

    upload.addEventListener('click', () => input.click());

    input.addEventListener('change', (e) => {
      const file = e.target.files?.[0];
      if (!file) return;

      // 验证图片类型
      if (!file.type.startsWith('image/')) {
        this._showStatus(document.getElementById('cc-status'), '请选择图片文件', 'error');
        return;
      }

      const reader = new FileReader();
      reader.onload = (ev) => {
        const dataUrl = ev.target.result;
        preview.innerHTML = `<img src="${dataUrl}" alt="preview">`;
        if (onData) onData(dataUrl);
      };
      reader.readAsDataURL(file);
    });
  }
}

// 全局实例（加载自定义角色管理器时注册到 window）
window.customCharManager = new CustomCharacterManager();
window.customCharManager._bindEvents();
