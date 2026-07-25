// 二次元桌宠 - AI回复情绪分析工具（增强版）
// 提供统一的 updateByAIResponse 逻辑，供 Live2D 和 VRM 使用
// 使用加权评分系统替代简单关键词匹配，更精准

const EMOTION_KEYWORDS = {
  // === 吐槽/傲娇 ===
  tsukkomi: [
    '真是的', '所以说', '脑回路', '是吗', '哦？', '原来如此', '我倒是无所谓',
    '笨蛋', '呆子', '傻瓜', '迟钝', '没救了', '唉', '叹气', '真拿你没办法',
    '你是认真的吗', '有没有搞错', '搞什么', '喂喂', '拜托', '晕',
    '敷衍', '随便你', '懒得理你', '关我什么事', '不是吧', '又来了',
    '你呀', '真受不了', '无语了', '行行行', '好好好', '随你怎么说',
    '懒得吐槽', '你开心就好', '哼', '切', '呵', '少来', '得了吧',
  ],

  // === 温柔/治愈 ===
  gentle: [
    '没关系', '慢慢来', '一直都在', '支持你', '加油', '陪着你', '休息',
    '辛苦了', '没事的', '放心吧', '我相信你', '你可以的', '别担心',
    '安心', '累了就休息', '我会陪着你', '有我在', '抱抱', '摸摸头',
    '你很棒', '做得好', '已经很好了', '别着急', '慢慢说', '我听着呢',
    '想哭就哭', '难受就说出来', '一起面对', '不用怕', '我一直都在',
    '你做得很好', '尽力就好', '温柔', '安慰', '抱抱你', '心疼',
    '好好休息', '照顾好自己', '要开心哦', '我会一直支持你',
  ],

  // === 吃醋/小脾气 ===
  jealous: [
    '是谁呀', '无所谓啦', '忘了', '生气了', '记着', '算账',
    '那个女人是谁', '花心', '见异思迁', '负心汉', '劈腿', '出轨',
    '我不开心', '哄我', '道歉', '解释一下', '敷衍我', '冷淡',
    '不理你了', '哼', '吃醋', '嫉妒', '心里不舒服', '偏心',
    '对别人那么好', '对我这么差', '区别对待', '双标', '过分',
    '再也不理你了', '生气', '哄不好了', '变心了吗', '忘了我吧',
  ],

  // === 思考/疑惑 ===
  thinking: [
    '嗯', '呼嗯', '让我想想', '思考中', '怎么说呢', '这个嘛',
    '怎么说好呢', '该怎么说', '唔', '嗯…', '嗯……', '让咱想想',
    '考虑一下', '想一想', '复杂', '难说', '不好说', '大概',
    '也许', '可能吧', '说不准', '谁知道呢', '该不会', '莫非',
    '怎么回事', '什么情况', '怎么会', '为什么', '奇怪', '不对劲',
  ],

  // === 开心/愉悦 ===
  happy: [
    '好开心', '高兴', '太好了', '真棒', '最喜欢了', '超喜欢',
    '开心', '快乐', '幸福', '美好', '好棒', '棒极了', '太赞了',
    '好耶', '万岁', '太好了呢', '开心死了', '感动', '惊喜',
    '今天真开心', '好心情', '美滋滋', '乐开花', '心花怒放',
    '最高', '最棒', '幸运', '感谢', '谢谢你', '真好', '好高兴',
  ],

  // === 低落/孤独 ===
  sad: [
    '寂寞', '孤单', '孤独', '难过', '伤心', '悲伤', '忧郁',
    '失落', '沮丧', '消沉', '郁闷', '烦躁', '不安', '害怕',
    '想哭', '眼泪', '哭泣', '哭', '难受', '心痛', '心累',
    '好累', '疲惫', '无力', '空虚', '迷茫', '彷徨', '想一个人',
    '不想说话', '没精神', '提不起劲', '算了', '就这样吧', '无所谓了',
  ],

  // === 惊讶/意外 ===
  surprised: [
    '诶', '哎', '咦', '哇', '啊', '真的吗', '真的假的',
    '不会吧', '开玩笑', '骗人的吧', '难以置信', '不敢相信',
    '吓我一跳', '吓了一跳', '大吃一惊', '惊了', '震惊',
    '没想到', '居然', '竟然', '意想不到', '好意外', '突然',
    '什么', '你说什么', '等等', '等一下', '慢着', '等等再说',
  ],

  // === 调皮/撒娇 ===
  playful: [
    '嘿嘿', '嘻嘻', 'kkk', '开玩笑啦', '逗你玩', '骗你的啦',
    '才怪', '怎么可能', '你说呢', '你猜', '猜猜', '想知道吗',
    '就不告诉你', '秘密', '不告诉你', '你求我呀', '叫姐姐',
    '卖个关子', '调皮', '捣蛋', '恶作剧', '作弄', '捉弄',
    '人家不依', '不要嘛', '偏不', '就不', '你来猜猜看',
    '求我呀', '撒个娇', '撒娇',
  ],
};

// 权重系统：第一条匹配 +3，后续每条 +1
function analyzeAIContent(text) {
  if (!text) return 'normal';

  const scores = {};
  for (const [emotion, keywords] of Object.entries(EMOTION_KEYWORDS)) {
    scores[emotion] = 0;
    let firstMatch = true;
    for (const kw of keywords) {
      if (text.includes(kw)) {
        scores[emotion] += firstMatch ? 3 : 1;
        firstMatch = false;
      }
    }
  }

  // 找出最高分
  let best = 'normal';
  let bestScore = 0;
  for (const [emotion, score] of Object.entries(scores)) {
    if (score > bestScore) {
      bestScore = score;
      best = emotion;
    }
  }

  return best;
}

function moodFromEmotion(emotion) {
  const map = {
    tsukkomi: 'annoyed', jealous: 'annoyed', gentle: 'gentle',
    thinking: 'thinking', happy: 'happy', sad: 'gentle',
    surprised: 'thinking', playful: 'happy', normal: 'normal',
  };
  return map[emotion] || 'normal';
}

function animationFromEmotion(emotion) {
  const map = {
    tsukkomi: 'tap', jealous: 'normal', gentle: 'happy',
    thinking: 'idle', happy: 'happy', sad: 'idle',
    surprised: 'tap', playful: 'happy', normal: 'normal',
  };
  return map[emotion] || 'normal';
}

window.analyzeAIContent = analyzeAIContent;
window.moodFromEmotion = moodFromEmotion;
window.animationFromEmotion = animationFromEmotion;
