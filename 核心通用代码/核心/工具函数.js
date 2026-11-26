// ========================================
//  二次元桌宠 - 共享工具函数
//  提供各模块共用的常量和工具方法
// ========================================

/** 角色ID → 文件夹名映射（所有内建角色） */
const CHARACTER_FOLDER_MAP = {
  megumi: '角色-加藤惠',
  yukino: '角色-雪之下雪乃',
  takagi: '角色-高木同学',
  rem: '角色-蕾姆',
  zerotwo: '角色-零二',
  ruoxi: '角色-若曦',
  megumin: '角色-惠惠',
  miku: '角色-初音未来',
  umaru: '角色-土间埋'
};

/** HTML转义：防止XSS注入 */
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str || '';
  return div.innerHTML;
}

/** 严格白名单 HTML 净化器（仅放行 Markdown 合法标签与安全属性，彻底防止 XSS 绕过） */
function sanitizeHtml(html) {
  if (!html) return '';
  if (window.DOMPurify && typeof window.DOMPurify.sanitize === 'function') {
    return window.DOMPurify.sanitize(String(html), {
      ALLOWED_URI_REGEXP: /^(?:https?:|mailto:|data:image\/(?:png|jpeg|gif|webp);base64,)/i
    });
  }
  const tpl = document.createElement('template');
  tpl.innerHTML = String(html);

  const allowedTags = new Set([
    'P', 'BR', 'STRONG', 'B', 'EM', 'I', 'U', 'S', 'DEL', 'INS', 'MARK',
    'CODE', 'PRE', 'BLOCKQUOTE', 'UL', 'OL', 'LI',
    'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'HR', 'A', 'SPAN', 'DIV', 'IMG',
    'TABLE', 'THEAD', 'TBODY', 'TR', 'TH', 'TD', 'SUP', 'SUB'
  ]);
  const allowedAttrs = new Set(['class', 'href', 'title', 'alt', 'src', 'target', 'rel', 'colspan', 'rowspan']);
  const safeHref = /^(?:https?:\/\/|mailto:)/i;
  const safeSrc = /^(?:https?:\/\/|data:image\/(?:png|jpeg|gif|webp);base64,)/i;

  const walk = (node) => {
    const children = Array.from(node.childNodes);
    for (const child of children) {
      if (child.nodeType === Node.ELEMENT_NODE) {
        if (!allowedTags.has(child.tagName)) {
          child.remove();
          continue;
        }
        const attrs = Array.from(child.attributes);
        for (const attr of attrs) {
          const name = attr.name.toLowerCase();
          const val = (attr.value || '').trim();
          if (!allowedAttrs.has(name)) {
            child.removeAttribute(attr.name);
            continue;
          }
          if (name === 'href') {
            const norm = val.replace(/[\u0000-\u001F\s]+/g, '');
            if (!safeHref.test(norm)) child.removeAttribute(attr.name);
          } else if (name === 'src') {
            const norm = val.replace(/[\u0000-\u001F\s]+/g, '');
            if (!safeSrc.test(norm)) child.removeAttribute(attr.name);
          }
        }
        if (child.tagName === 'A') {
          child.setAttribute('rel', 'noopener noreferrer');
          child.setAttribute('target', '_blank');
        }
        walk(child);
      } else if (child.nodeType === Node.COMMENT_NODE) {
        child.remove();
      }
    }
  };

  walk(tpl.content);
  return tpl.innerHTML;
}

/** 防抖：延迟执行，短时间内多次调用只执行最后一次 */
function debounce(fn, delay) {
  let timer = null;
  return (...args) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => { fn.apply(null, args); timer = null; }, delay);
  };
}
