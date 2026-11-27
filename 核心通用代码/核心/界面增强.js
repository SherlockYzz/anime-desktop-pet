// 界面增强：只做纯表现层的小交互，不触碰任何业务逻辑与数据。
// 删除 index.html 里对应的 <script> 即可完整移除。
(function () {
  'use strict';

  const ready = (fn) => (document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', fn, { once: true })
    : fn());
  const frame = (fn) => { let queued = false; return () => { if (queued) return; queued = true; requestAnimationFrame(() => { queued = false; fn(); }); }; };

  // 1. 输入框随内容自动增高（上限由 CSS max-height 控制）
  function autoGrow(el) {
    if (!el) return;
    const fit = () => {
      el.style.height = 'auto';
      el.style.height = Math.min(el.scrollHeight, 120) + 'px';
      el.style.overflowY = el.scrollHeight > 120 ? 'auto' : 'hidden';
    };
    el.addEventListener('input', fit);
    // 发送后业务代码会把 value 置空，这里在下一帧复位高度
    el.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) requestAnimationFrame(fit); });
    el.form?.addEventListener('reset', () => requestAnimationFrame(fit));
    el.dataset.uiAutogrow = '1';
    el._uiFit = fit;
    fit();
  }

  // 2. 设置页：把扁平的表单按主题收拢成卡片分组，并生成可跟随滚动高亮的分区导航。
  //    只移动节点、不增删控件；所有 id 不变，业务代码照常按 id 取用。
  function groupSettings(content) {
    if (content.dataset.uiGrouped) return;
    content.dataset.uiGrouped = '1';
    const itemOf = (id) => document.getElementById(id)?.closest('.setting-item') || null;
    const splits = new Map([[itemOf('response-mode'), '回复风格'], [itemOf('always-on-top'), '窗口']]);
    const open = (before, title) => {
      const sec = document.createElement('section');
      sec.className = 'ui-group';
      if (title) {
        const h = document.createElement('div');
        h.className = 'ui-group-title';
        h.textContent = title;
        sec.appendChild(h);
      }
      content.insertBefore(sec, before);
      return sec;
    };
    let cur = null;
    for (const el of [...content.children]) {
      if (el.classList.contains('btn-save-settings')) { cur = null; continue; }
      if (el.id === 'setting-custom-char-actions') { el.classList.add('ui-group'); cur = null; continue; } // 自带标题，本身就是一组
      if (el.classList.contains('setting-section-divider')) cur = open(el, '');
      else if (splits.has(el)) cur = open(el, splits.get(el));
      else if (!cur) cur = open(el, '模型接口');
      cur.appendChild(el);
    }
  }

  function buildSettingsNav() {
    const panel = document.getElementById('settings-panel');
    const content = panel?.querySelector('.settings-content');
    if (!panel || !content || panel.querySelector('.ui-settings-nav')) return;
    groupSettings(content);

    const short = (raw) => raw.replace(/(设定|管理|与防打字设定)$/, '').replace(/^(角色|自定义|原作)/, '') || raw;
    const sections = [...content.querySelectorAll(':scope > .ui-group')].map((el) => {
      const raw = (el.querySelector('.ui-group-title, .setting-section-divider')?.textContent || '').trim();
      return raw ? { el, label: short(raw) } : null;
    }).filter(Boolean);
    if (sections.length < 2) return;

    const nav = document.createElement('div');
    nav.className = 'ui-settings-nav';
    sections.forEach((s, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = s.label;
      b.addEventListener('click', () => {
        const top = i === 0 ? 0 : s.el.getBoundingClientRect().top - content.getBoundingClientRect().top + content.scrollTop - 10;
        content.scrollTo({ top, behavior: 'smooth' });
      });
      s.btn = b;
      nav.appendChild(b);
    });
    content.before(nav);

    const spy = frame(() => {
      const base = content.getBoundingClientRect().top + 28;
      let current = sections[0];
      for (const s of sections) {
        s.btn.hidden = s.el.offsetParent === null;
        if (!s.btn.hidden && s.el.getBoundingClientRect().top <= base) current = s;
      }
      if (content.scrollTop + content.clientHeight >= content.scrollHeight - 2) {
        current = [...sections].reverse().find((s) => !s.btn.hidden) || current;
      }
      sections.forEach((s) => s.btn.classList.toggle('active', s === current));
      const a = current.btn;
      if (a.offsetLeft < nav.scrollLeft || a.offsetLeft + a.offsetWidth > nav.scrollLeft + nav.clientWidth) {
        nav.scrollTo({ left: a.offsetLeft - 14, behavior: 'smooth' });
      }
      syncRanges(panel);
    });
    content.addEventListener('scroll', spy, { passive: true });
    new MutationObserver(spy).observe(panel, { attributes: true, attributeFilter: ['class', 'style'], subtree: true });
    spy();
  }

  // 3. 滑块：把当前进度写进 --ui-fill，CSS 据此画出"已填充"的轨道
  function syncRange(el) {
    const min = Number(el.min || 0);
    const max = Number(el.max || 100);
    const pct = max > min ? ((Number(el.value) - min) / (max - min)) * 100 : 0;
    el.style.setProperty('--ui-fill', pct.toFixed(1) + '%');
  }
  function syncRanges(root) { (root || document).querySelectorAll('input[type="range"]').forEach(syncRange); }
  function enableRangeFill() {
    document.addEventListener('input', (e) => { if (e.target?.type === 'range') syncRange(e.target); }, true);
    // 业务代码用 slider.value = x 赋值时不会触发事件：弹层出现时补一次
    const menu = document.getElementById('pet-scale-menu');
    if (menu) new MutationObserver(() => syncRanges(menu)).observe(menu, { attributes: true, attributeFilter: ['class', 'style'] });
    document.addEventListener('click', (e) => { if (e.target.closest?.('.scale-preset-btn')) requestAnimationFrame(() => syncRanges(menu)); }, true);
    syncRanges();
  }

  // 4. 聊天代码块：标题条显示语言名，右上角"复制"
  function enableCodeCopy() {
    const box = document.getElementById('chat-messages');
    if (!box) return;
    const decorate = (root) => {
      root.querySelectorAll?.('.message-text pre, .thinking-content pre').forEach((pre) => {
        if (pre.querySelector(':scope > .ui-code-copy')) return;
        const lang = /(?:language|lang)-([\w+#.-]+)/.exec(pre.querySelector('code')?.className || '');
        pre.dataset.lang = lang ? lang[1] : 'code';
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'ui-code-copy';
        b.textContent = '复制';
        pre.appendChild(b);
      });
    };
    box.addEventListener('click', async (e) => {
      const b = e.target.closest?.('.ui-code-copy');
      if (!b) return;
      e.stopPropagation();
      const code = b.parentElement.querySelector('code');
      try {
        await navigator.clipboard.writeText(code ? code.innerText : '');
        b.textContent = '已复制';
        b.classList.add('is-done');
      } catch (_) {
        b.textContent = '复制失败';
      }
      setTimeout(() => { b.textContent = '复制'; b.classList.remove('is-done'); }, 1400);
    });
    new MutationObserver(frame(() => decorate(box))).observe(box, { childList: true, subtree: true });
    decorate(box);
  }

  // 5. 角色卡片：把每个角色自己的主题色交给 CSS（--c），卡片据此着色
  function tintCharacterCards() {
    const grid = document.getElementById('character-grid');
    if (!grid) return;
    const tint = () => grid.querySelectorAll('.character-card').forEach((card) => {
      const c = card.querySelector('.character-card-name')?.style.color;
      if (c && card.style.getPropertyValue('--c') !== c) card.style.setProperty('--c', c);
    });
    new MutationObserver(frame(tint)).observe(grid, { childList: true });
    tint();
  }

  ready(() => {
    const guard = (name, fn) => { try { fn(); } catch (e) { console.warn('[UI] ' + name, e); } };
    guard('autoGrow', () => autoGrow(document.getElementById('chat-input')));
    guard('autoGrow', () => autoGrow(document.getElementById('code-ai-input')));
    // 进入面板模式时样式才生效，这里在模式切换后重新量一次高度
    const refit = () => {
      document.getElementById('chat-input')?._uiFit?.();
      document.getElementById('code-ai-input')?._uiFit?.();
    };
    window.addEventListener('resize', () => requestAnimationFrame(refit), { passive: true });
    new MutationObserver(() => requestAnimationFrame(refit)).observe(document.body, { attributes: true, attributeFilter: ['class'] });
    document.querySelectorAll('.tab').forEach((t) => t.addEventListener('click', () => requestAnimationFrame(() => {
      document.getElementById('code-ai-input')?._uiFit?.();
    })));
    guard('settingsNav', buildSettingsNav);
    guard('rangeFill', enableRangeFill);
    guard('codeCopy', enableCodeCopy);
    guard('characterTint', tintCharacterCards);

    // 业务代码以 input.value = '' 清空输入框时不会触发 input 事件，这里补一次高度复位
    document.getElementById('btn-chat-send')?.addEventListener('click', () => {
      requestAnimationFrame(() => document.getElementById('chat-input')?._uiFit?.());
    });
  });
})();
