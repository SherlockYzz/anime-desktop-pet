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

  // 6. 聊天区小组件：日期问候条、建议话题、回到最新、整条回复复制。
  //    全部挂在聊天页自己的容器里，业务代码按 .message 计数/裁剪，不受这些节点影响。
  const ICON = {
    down: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 5v13M6.5 12.5 12 18l5.500-5.500"/></svg>',
    copy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="8.500" y="8.500" width="11" height="11" rx="2.500"/><path d="M15.500 5.500v-.500a2 2 0 0 0-2-2H6.500a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2H7"/></svg>',
    done: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.200" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 12.500 4.500 4.500L19 7.500"/></svg>',
    spark: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2.500c.600 4.700 2.300 6.400 7 7-4.700.600-6.400 2.300-7 7-.600-4.700-2.300-6.400-7-7 4.700-.600 6.400-2.300 7-7Zm6.500 12.500c.300 2.100 1 2.800 3 3-2 .300-2.700 1-3 3-.300-2-1-2.700-3-3 2-.200 2.700-.900 3-3Z"/></svg>',
  };
  const partOfDay = (h) => (h < 5 ? 'night' : h < 11 ? 'morning' : h < 14 ? 'noon' : h < 18 ? 'afternoon' : h < 23 ? 'evening' : 'night');
  const GREETING = { morning: '早上好', noon: '中午好', afternoon: '下午好', evening: '晚上好', night: '夜深了' };
  const SUGGESTIONS = {
    morning: ['早安，帮我规划一下今天', '给我一句元气满满的话', '今天适合做点什么'],
    noon: ['午饭吃什么好', '午休前陪我聊两句', '讲个冷笑话'],
    afternoon: ['有点犯困，帮我提提神', '帮我理一下待办的思路', '讲个冷笑话'],
    evening: ['今天有点累，安慰我一下', '晚饭吃什么好', '推荐一部番吧'],
    night: ['睡不着，陪我聊聊', '给我讲个睡前小故事', '跟我说句晚安'],
  };

  function enableChatExtras() {
    const tab = document.getElementById('tab-chat');
    const box = document.getElementById('chat-messages');
    const input = document.getElementById('chat-input');
    const send = document.getElementById('btn-chat-send');
    const inputArea = tab?.querySelector('.input-area');
    if (!tab || !box || !input || !send || !inputArea) return;

    // 6.1 回到最新：零高度锚点夹在消息区与输入区之间，按钮浮在消息区右下角
    const anchor = document.createElement('div');
    anchor.className = 'ui-fab-anchor';
    const fab = document.createElement('button');
    fab.type = 'button';
    fab.className = 'ui-scroll-fab';
    fab.title = '回到最新消息';
    fab.setAttribute('aria-label', '回到最新消息');
    fab.tabIndex = -1;
    fab.innerHTML = ICON.down;
    fab.addEventListener('click', () => box.scrollTo({ top: box.scrollHeight, behavior: 'smooth' }));
    anchor.appendChild(fab);
    tab.insertBefore(anchor, inputArea);

    // 6.2 建议话题：还没开口时给几个开场白，点一下等同于"输入并发送"
    const suggest = document.createElement('div');
    suggest.className = 'ui-suggest';
    suggest.setAttribute('role', 'group');
    suggest.setAttribute('aria-label', '试试这样开场');
    let suggestPart = '';
    const fillSuggest = () => {
      const part = partOfDay(new Date().getHours());
      if (part === suggestPart) return;
      suggestPart = part;
      suggest.textContent = '';
      const lead = document.createElement('span');
      lead.className = 'ui-suggest-lead';
      lead.innerHTML = ICON.spark;
      suggest.appendChild(lead);
      ['介绍一下你自己', ...SUGGESTIONS[part]].forEach((text) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'ui-chip';
        b.textContent = text;
        suggest.appendChild(b);
      });
    };
    suggest.addEventListener('click', (e) => {
      const chip = e.target.closest?.('.ui-chip');
      if (!chip || send.disabled) return;
      input.value = chip.textContent;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      send.click();
      requestAnimationFrame(() => input._uiFit?.());
    });
    tab.insertBefore(suggest, inputArea);

    // 6.3 日期问候条
    const DAYS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    const dayChip = document.createElement('div');
    dayChip.className = 'ui-day-chip';
    const ensureDayChip = () => {
      const now = new Date();
      const text = (now.getMonth() + 1) + '月' + now.getDate() + '日 ' + DAYS[now.getDay()] + ' · ' + GREETING[partOfDay(now.getHours())];
      if (dayChip.textContent !== text) dayChip.textContent = text;
      if (box.firstElementChild !== dayChip && box.querySelector('.message')) box.prepend(dayChip);
    };

    // 6.4 整条回复复制（流式输出中的那条由 CSS 暂时隐藏）
    const decorate = () => box.querySelectorAll('.message.ai > .message-content').forEach((mc) => {
      if (!mc.querySelector(':scope > .message-text') || mc.querySelector(':scope > .ui-msg-copy')) return;
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'ui-msg-copy';
      b.title = '复制这条回复';
      b.setAttribute('aria-label', '复制这条回复');
      b.innerHTML = ICON.copy;
      mc.appendChild(b);
    });
    box.addEventListener('click', async (e) => {
      const b = e.target.closest?.('.ui-msg-copy');
      if (!b) return;
      const mt = b.parentElement.querySelector(':scope > .message-text');
      if (!mt) return;
      mt.classList.add('ui-copying'); // 读取期间隐藏代码块里的"复制"按钮文字
      const text = mt.innerText.trim();
      mt.classList.remove('ui-copying');
      try {
        await navigator.clipboard.writeText(text);
        b.innerHTML = ICON.done;
        b.classList.add('is-done');
      } catch (_) {
        b.classList.add('is-fail');
      }
      setTimeout(() => { b.innerHTML = ICON.copy; b.classList.remove('is-done', 'is-fail'); }, 1400);
    });

    const syncFab = frame(() => fab.classList.toggle('show', box.scrollHeight - box.scrollTop - box.clientHeight > 140));
    const syncSuggest = () => {
      const off = !!box.querySelector('.message.user') || !box.querySelector('.message') || input.value.trim() !== '';
      if (!off) fillSuggest();
      if (suggest.hidden !== off) suggest.hidden = off;
    };
    const sync = frame(() => { ensureDayChip(); decorate(); syncSuggest(); syncFab(); });
    box.addEventListener('scroll', syncFab, { passive: true });
    input.addEventListener('input', syncSuggest);
    new MutationObserver(sync).observe(box, { childList: true });
    suggest.hidden = true;
    sync();
  }

  // 7. 舞台名牌：角色名 / 出处 / 一句话简介。窄窗口只露出处小签，宽屏分栏时展开成完整名牌。
  function stageNameplate() {
    const stage = document.getElementById('live2d-container');
    const title = document.querySelector('#titlebar .pet-name');
    if (!stage) return;
    const np = document.createElement('div');
    np.className = 'ui-nameplate';
    np.setAttribute('aria-hidden', 'true');
    const parts = ['name', 'series', 'tagline'].map((k) => {
      const s = document.createElement('span');
      s.className = 'ui-np-' + k;
      np.appendChild(s);
      return s;
    });
    np.hidden = true;
    stage.appendChild(np);
    const sync = () => {
      const c = window.characterManager?.getCurrentCharacter?.();
      if (!c) return;
      [c.name, c.series, c.tagline].forEach((v, i) => { const t = v || ''; if (parts[i].textContent !== t) parts[i].textContent = t; });
      np.hidden = !c.name;
    };
    if (title) new MutationObserver(sync).observe(title, { childList: true, characterData: true, subtree: true });
    new MutationObserver(sync).observe(document.body, { attributes: true, attributeFilter: ['class'] });
    sync();
    setTimeout(sync, 1500); // 角色数据是异步载入的，补一次
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
    guard('chatExtras', enableChatExtras);
    guard('nameplate', stageNameplate);

    // 业务代码以 input.value = '' 清空输入框时不会触发 input 事件，这里补一次高度复位
    document.getElementById('btn-chat-send')?.addEventListener('click', () => {
      requestAnimationFrame(() => document.getElementById('chat-input')?._uiFit?.());
    });
  });
})();
