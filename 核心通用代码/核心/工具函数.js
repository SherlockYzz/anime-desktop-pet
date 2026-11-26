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

/** 严格 HTML 净化器（白名单过滤危险标签、事件属性与危险 URI 协议，防止 Markdown XSS） */
function sanitizeHtml(html) {
  if (!html) return '';
  const tpl = document.createElement('template');
  tpl.innerHTML = String(html);
  const blockedTags = new Set([
    'SCRIPT', 'IFRAME', 'OBJECT', 'EMBED', 'APPLET', 'STYLE',
    'LINK', 'META', 'BASE', 'FORM', 'INPUT', 'BUTTON', 'TEXTAREA',
    'SELECT', 'OPTION', 'SVG', 'MATH', 'TEMPLATE', 'NOSCRIPT'
  ]);
  const urlAttrs = new Set(['href', 'src', 'xlink:href', 'action', 'formaction']);

  const walk = (node) => {
    const children = Array.from(node.childNodes);
    for (const child of children) {
      if (child.nodeType === Node.ELEMENT_NODE) {
        if (blockedTags.has(child.tagName)) {
          child.remove();
          continue;
        }
        const attrs = Array.from(child.attributes);
        for (const attr of attrs) {
          const name = attr.name.toLowerCase();
          const val = (attr.value || '').trim();
          if (name.startsWith('on') || name === 'srcdoc') {
            child.removeAttribute(attr.name);
          } else if (urlAttrs.has(name)) {
            const normalized = val.replace(/[\u0000-\u001F\s]+/g, '').toLowerCase();
            if (/^(javascript|vbscript|file|data:text\/html):/i.test(normalized) || normalized.startsWith('data:text/html')) {
              child.removeAttribute(attr.name);
            }
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
