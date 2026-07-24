// 二次元桌宠 - AI回复情绪分析工具（共享模块）
// 提供统一的 updateByAIResponse 逻辑，供 Live2D 和 VRM 使用

const EMOTION_KEYWORDS = {
  tsukkomi: ['真是的', '所以说', '脑回路', '是吗', '哦？', '原来', '我倒是无所谓'],
  gentle: ['没关系', '慢慢来', '一直都在', '支持你', '加油', '陪着你', '休息'],
  jealous: ['是谁呀', '无所谓啦', '忘了', '生气', '记着', '算账'],
  thinking: ['嗯', '呼嗯', '让我想想'],
};

function analyzeAIContent(text) {
  if (!text) return 'normal';
  if (EMOTION_KEYWORDS.tsukkomi.some(w => text.includes(w))) return 'tsukkomi';
  if (EMOTION_KEYWORDS.jealous.some(w => text.includes(w))) return 'jealous';
  if (EMOTION_KEYWORDS.gentle.some(w => text.includes(w))) return 'gentle';
  if (EMOTION_KEYWORDS.thinking.some(w => text.includes(w))) return 'thinking';
  return 'normal';
}

function moodFromEmotion(emotion) {
  const map = { tsukkomi: 'annoyed', jealous: 'annoyed', gentle: 'gentle', thinking: 'thinking', normal: 'normal' };
  return map[emotion] || 'normal';
}

function animationFromEmotion(emotion) {
  const map = { tsukkomi: 'tap', jealous: 'normal', gentle: 'happy', thinking: 'idle', normal: 'normal' };
  return map[emotion] || 'normal';
}

// 导出为全局
window.analyzeAIContent = analyzeAIContent;
window.moodFromEmotion = moodFromEmotion;
window.animationFromEmotion = animationFromEmotion;
