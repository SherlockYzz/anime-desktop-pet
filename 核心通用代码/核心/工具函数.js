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
  zerotwo: '角色-零二'
};

/** HTML转义：防止XSS注入 */
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str || '';
  return div.innerHTML;
}

/** 防抖：延迟执行，短时间内多次调用只执行最后一次 */
function debounce(fn, delay) {
  let timer = null;
  return (...args) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => { fn.apply(null, args); timer = null; }, delay);
  };
}
