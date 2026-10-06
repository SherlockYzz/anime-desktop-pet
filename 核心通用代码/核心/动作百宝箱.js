// ========================================
//  二次元桌宠 - 动作百宝箱与深度交互管理器
//  支持全角色动态姿态菜单、摸头/戳身触碰反馈、连击暴走、全角色CV语音联动
// ========================================

class ActionMenuManager {
  constructor() {
    // 触碰语音不重复洗牌队列与上一条语音记录
    this._touchVoiceQueues = {};
    this._lastTouchVoice = {};

    // ★ 全阵容 9 大角色 133 条真实原声逐一听音核准字典（100% 音文精准对齐）
    this.VOICE_TRANSCRIPTS = {
      // 1. 若曦（12段中文原声）
      ruoxi: {
        '01': '乖乖待命呼吸中，随时听候主人差遣。 🌸',
        '02': '开启专注工作模式，主人也要加油哦！ 💼',
        '03': '抱紧暖暖的狐狸尾巴，呼噜噜睡喽。 🌙',
        '04': '好耶，若曦可以在主人的桌面上尽情溜达啦！ 🐾',
        '05': '主人好呀，若曦一直都在你身边呢。 👋',
        '06': '嗖，看若曦轻巧一跃！ ⚡',
        '07': '成果已经准备好啦，主人请快快检阅。 📜',
        '08': '呜，遇到小困难了，容若曦抱头缓一缓嘛。 😿',
        '09': '歪头等待主人的新指令中。 💭',
        '10': '摸摸狐狸耳朵好舒服呀，尾巴都要摇起来啦！ ✨',
        '11': '戳戳我干嘛呀，主人？ 🐾',
        '12': '呜哇，连续戳我这么多下，若曦要抗议啦！ 😿'
      },

      // 2. 加藤惠（10段安野希世乃《一択彼女 加藤恵》原声）
      megumi: {
        '01': '现在是下午2点20分哦。',
        '02': '接下来要决定只属于我们两个人的游戏剧本了哦。',
        '03': '通过这次创作活动，慢慢向你敞开心扉……',
        '04': '说不定会开始做出一些不可思议的举动呢。',
        '05': '我有没有成为只属于你的第一女主角呢？',
        '06': '请尽情享受只属于我们两个人的回忆制作吧。',
        '07': '你与加藤。',
        '08': '因为加藤会为你提供提示的哦。',
        '09': '答案的候选项一共有12种哦。',
        '10': '点击灯泡按钮或使用营养饮料，就能想出新点子哦。'
      },

      // 3. 惠惠（10段高桥李依红魔族原声）
      megumin: {
        '01': '这里是以金钱为媒介向顾客提供物品的场所……嗯，有希的说话方式好难啊。',
        '02': '现在正是狂宴之时！来吧，炽炎升腾！',
        '03': '禁忌……那与悲剧颇为相似。',
        '04': '来吧，今天也一起 Let\'s 爆裂吧！',
        '05': '除了爆裂魔法之外，还有什么值得学习的技能吗？',
        '06': '你已经领悟到爆裂魔法的魅力了呢！',
        '07': '这次邂逅乃世界之宿命。来吧，收下这起始之证吧！',
        '08': '即便是魔王军干部，也绝非吾之爆裂魔法的敌手！',
        '09': '吾之爆裂魔法与梅露的雷电究竟孰强孰弱，迟早得做个了断呢。',
        '10': '万物皆归于灰烬，自深渊降临吧！这就是人类最大威力的究极攻击魔法——Explosion！'
      },

      // 4. 蕾姆（26段水濑祈联动原声）
      rem: {
        '01': '请做好觉悟，接下来要变得忙碌起来了哦。',
        '02': '我会做好饭菜等您的，请务必平安归来。',
        '03': '请不要勉强自己，您的身体才是第一位的哦。',
        '04': '今天的膳食，姐姐大人似乎准备了蒸白薯，请搭配蕾姆的料理一同尽情享用吧。',
        '05': '蕾姆在战斗中也能派上用场，开路先锋之类的工作请尽管交给我吧。',
        '06': '从斯卡哈大人身上，能感受到在各种意义上都很危险的气息呢。',
        '07': '只要您吩咐，无论去哪里蕾姆都会陪伴在您身边。',
        '08': '谈论未来的话题时，要笑着说才行哦，对吧？',
        '09': '在不列颠也在进行类似王选的事情吗……结果还是会演变成纷争呢。',
        '10': '这座城堡比罗兹瓦尔大人的宅邸还要宽敞，打扫起来真不容易呢，呼……',
        '11': '在，请问有什么吩咐吗？',
        '12': '呵呵，大家总是形影不离，感情真好呢。',
        '13': '接下来，蕾姆计划陪佣兵大人进行战斗训练。',
        '14': '真是勤勉呢，蕾姆正准备把新采购的书籍送过去。',
        '15': '有人经常潜入厨房，需要多加留心，也得去转告给姐姐大人才行。',
        '16': '那歌声让人心情非常舒畅。诶？啊，蕾姆哪里会唱歌，实在是不敢当……',
        '17': '那个……如果被这样强行对待的话，一不小心鬼角就会露出来了……',
        '18': '被这样温柔以待的话，蕾姆会忍不住想要撒娇的……',
        '19': '如果总是这样恶作剧的话，就连蕾姆也是会生气的哦？',
        '20': '呀啊！突、突然被触碰的话会吓一跳的，请先打声招呼好吗！',
        '21': '头好晕呀～……',
        '22': '请、请快住手！要是再不知适可而止的话……',
        '23': '是、是地震吗！？请快避难！',
        '24': '可能是敌人的魔法！请小心防备！',
        '25': '请再稍微温柔一点……',
        '26': '我名叫蕾姆。从今天起，由我来负责全力辅佐您。'
      },

      // 5. 初音未来（10段藤田咲歌姬原声）
      miku: {
        '01': '谢谢你的应援！ ♪',
        '02': '好想早点见到你呀！',
        '03': '谢谢你能来！',
        '04': '我想用歌声传递幸福！已经等不及下一场演唱会啦！',
        '05': '嘿嘿，那个呀，我们一起跳舞吧！',
        '06': '下一首歌也请多多指教哦！',
        '07': '我要尽情高歌啦！',
        '08': '我早就想唱歌想得迫不及待啦！',
        '09': '更新完成！ ✨',
        '10': '一起跳舞吧！ ♪'
      },

      // 6. 高木同学（10段高桥李依剧场版/VR原声）
      takagi: {
        '01': '你现在在看什么呢？哦～原来是在看我呀，这样啊～',
        '02': '抱歉抱歉，不能再捉弄你了呢。',
        '03': '呐，你是喜欢的吧？喜欢的话直接说喜欢不就好了嘛。',
        '04': '意思是你是因为担心我才特地跑回来的对吧？',
        '05': '呐，现在是不是感觉我就在离你非常近的地方呀？像这样。',
        '06': '就算我走到这边来你也会看着我吗？啊，对上视线了，呵呵～',
        '07': '是因为你想去借别人忘在学校的伞对吧？（呜，被看穿了……）',
        '08': '好开心呀～！没想到西片居然会主动邀请我共撑一把伞。',
        '09': '我喜欢西片哦。',
        '10': '要是能在七夕那天见面的话，我会很开心的。'
      },

      // 7. 零二（10段户松遥原声）
      zerotwo: {
        '01': '你就是我的达令！',
        '02': '我好像对你有点感兴趣呢，要不要成为我的达令？',
        '03': '这个又甜又好吃哦，一起吃吧？',
        '04': '好好地驾驶成功了呢，刚才很棒哦。',
        '05': '真天真呢，不过我并不讨厌哦。',
        '06': '我也一直都是孤身一人哦，因为这对角的关系。',
        '07': '看吧，很简单对吧？',
        '08': '别一直死盯着我看啦。',
        '09': '大海真是让人心情舒畅呢。',
        '10': '只有你一个。'
      },

      // 8. 雪之下雪乃（10段早见沙织侍奉部原声）
      yukino: {
        '01': '欢迎来到侍奉部，我很欢迎你哦。',
        '02': '既然受人所托，我就会尽到责任。',
        '03': '我会帮你矫正你的问题，心怀感激吧。',
        '04': '真是惊讶，一看到你的脸，困意瞬间就一扫而空了呢。',
        '05': '我会对你手下留情的……',
        '06': '我可是相当记仇的类型哦。',
        '07': '和别人说话的时候，请看着对方的方向。',
        '08': '欸？我虽然也会口出毒舌……',
        '09': '虽然我也会口出毒舌和失言，但唯独没有说过谎言。',
        '10': '你可以完全放心，好好休息吧。'
      },

      // 9. 土间埋（35段田中爱美干物妹原声）
      umaru: {
        '01': '欢迎回来，哥哥！',
        '02': '哥哥，能不能稍微去那边帮我买包薯片回来呀？',
        '03': '帮我买漫画回来嘛，哥哥！好想看、好想看、好想看嘛——！',
        '04': '好慢！太慢了啦哥哥！不陪小埋打个痛快游戏的话，我可不原谅你哦！',
        '05': '薯片和巧克力的搭配虽然棒极了，但芝士和鱿鱼的搭配也无可挑剔呢！',
        '06': '在夏天有空调、冬天有被炉的小埋天堂里，悠闲地懒散度日吧！',
        '07': '好想和海老名、切绘还有希尔芬她们去哪里玩呀——好想去玩呀——！（偷瞄，偷瞄）',
        '08': '小埋的布丁不见了！小埋睡觉前明明还在的！是哥哥吃掉了吧！呜哇啊啊啊！',
        '09': '人家好寂寞的，哥哥！你去哪儿了嘛，真是的！',
        '10': '哥哥！嘿嘿，只是试着叫一下而已！',
        '11': '嗯？怎么啦？哥哥，你叫小埋了吗？',
        '12': '呜呜，哥哥坏心眼！居然捉弄弱小可怜的小埋！',
        '13': '怎么啦？看起来没精打采的。烦恼太多的话可是会枯萎的哦？',
        '14': '哼哼哼，哥哥只有陪小埋玩这一条路可走哦。来吧，乖乖认命吧，哥哥！',
        '15': '好啦好啦，再睡10分钟就好……有什么关系嘛，哥哥今天也休息一天嘛……',
        '16': '哥哥，你要把小埋丢下，自己去别的地方吗？',
        '17': '啊嘻、哇哈哈哈！等、等一下！都、都说好痒了啦！',
        '18': '好，你刚才碰我了吧！惩罚游戏——！现在立刻去为小埋买超——多零食回来！',
        '19': '谢谢你，哥哥！今天工作也要加油哦！',
        '20': '真是的，等一下！不要摸奇怪的地方啦，哥哥！',
        '21': '哥、哥、哥哥！不好啦，地面在摇晃！',
        '22': '救命啊，哥哥！',
        '23': '呜哇啊啊啊！笨蛋哥哥！你干什么呀！',
        '24': '啊呜……头、头好晕……',
        '25': '哥哥，你在哪儿？不可以把小埋一个人丢下哦！',
        '26': '我回来啦，哥哥！偶尔也带小埋去哪里玩嘛！',
        '27': '听说有新敌人正在出现！展现小埋游戏技巧的时刻到啦！',
        '28': '好像有新剧情哦！预感这会是神作剧情！必须去看看才行！',
        '29': '礼物马上就要消失啦！太浪费了，小埋可要收下了哦？',
        '30': '有看起来很强的敌人呢……哥、哥哥，接下来就交给你啦——！',
        '31': '总觉得是个和其它敌人氛围不同的家伙呢。哥哥，千万别受伤哦？',
        '32': '好像有新的支线剧情哦！小埋传说会不会也记载在这里面呢——？',
        '33': '收到好友申请了哦！会是海老名还是切绘呢？说不定是希尔芬呢！',
        '34': '还有没拆开的礼物哦！真是太浪费了！就让小埋来帮你有效利用吧——！',
        '35': '小埋——！'
      }
    };

    // 角色专属姿态与动作数据库（9大角色完整覆盖 + 100%音文一致专属CV语音 + 多语音不重复触碰池）
    this.ACTION_DATABASE = {
      // 1. 若曦（原创白狐仙 · ChatGPT Pets v2 精灵表 · 中文萌系仙狐声线）
      ruoxi: {
        title: '✨ 若曦姿态百宝箱',
        wanderVoices: { start: '04', stop: '01' },
        actions: [
          { id: 'idle', label: '待机呼吸·乖乖待命', icon: '🌸', kind: 'sprite', method: 'goIdle', voice: '01', bubble: '乖乖待命呼吸中，随时听候主人差遣。 🌸' },
          { id: 'work', label: '伏案专注·打工模式', icon: '💼', kind: 'sprite', method: 'toggleWork', voice: '02', bubble: '开启专注工作模式，主人也要加油哦！ 💼' },
          { id: 'sleep', label: '抱尾入睡·呼噜呼噜', icon: '🌙', kind: 'sprite', method: 'toggleSleep', voice: '03', bubble: '抱紧暖暖的狐狸尾巴，呼噜噜睡喽。 🌙' },
          { id: 'wander', label: '自由漫步·桌面溜达', icon: '🐾', kind: 'wander', voice: '04', bubble: '好耶，若曦可以在主人的桌面上尽情溜达啦！ 🐾' },
          { id: 'wave', label: '抬手问候·挥挥小爪', icon: '👋', kind: 'sprite', method: 'wave', voice: '05', bubble: '主人好呀，若曦一直都在你身边呢。 👋' },
          { id: 'jump', label: '纵身跃起·轻巧一跳', icon: '⚡', kind: 'sprite', method: 'jump', voice: '06', bubble: '嗖，看若曦轻巧一跃！ ⚡' },
          { id: 'review', label: '呈递成果·请君检阅', icon: '📜', kind: 'sprite', method: 'review', voice: '07', bubble: '成果已经准备好啦，主人请快快检阅。 📜' },
          { id: 'fail', label: '抱头沮丧·受阻缓和', icon: '😿', kind: 'sprite', method: 'fail', voice: '08', bubble: '呜，遇到小困难了，容若曦抱头缓一缓嘛。 😿' },
          { id: 'wait', label: '歪头眨眼·静候指令', icon: '💭', kind: 'sprite', method: 'wait', voice: '09', bubble: '歪头等待主人的新指令中。 💭' }
        ],
        touch: {
          head: { kind: 'sprite', method: 'wave', voice: '10', voices: ['10', '05', '01', '09'], bubble: '摸摸狐狸耳朵好舒服呀，尾巴都要摇起来啦！ ✨' },
          body: { kind: 'sprite', method: 'jump', voice: '11', voices: ['11', '06', '10', '05', '09'], bubble: '戳戳我干嘛呀，主人？ 🐾' },
          rage: { kind: 'sprite', method: 'fail', voice: '12', voices: ['12', '08', '11'], bubble: '呜哇，连续戳我这么多下，若曦要抗议啦！ 😿' }
        }
      },

      // 2. 加藤惠（路人女主的养成方法 · 索尼官方一択彼女Live2D · 安野希世乃温柔原声）
      megumi: {
        title: '🌸 加藤惠动作百宝箱',
        wanderVoices: { start: '06', stop: '01' },
        actions: [
          { id: 'idle', label: '待机呼吸·乖乖待命', icon: '🌸', motion: 'IDLING_01', expression: 'F_NORMAL', voice: '01', bubble: '现在是下午2点20分哦。' },
          { id: 'fun', label: '身前搭手·专属剧本', icon: '😊', motion: 'I_FUN_W', expression: 'F_FUN', voice: '02', bubble: '接下来要决定只属于我们两个人的游戏剧本了哦。' },
          { id: 'pout', label: '鼓嘴侧头·奇妙举动', icon: '😤', motion: 'I_ANGRY_W', expression: 'F_ANGRY', voice: '04', bubble: '说不定会开始做出一些不可思议的举动呢。' },
          { id: 'surprise', label: '双手张开·贴心提示', icon: '😳', motion: 'I_SURPRISE_W', expression: 'F_SURPRISE', voice: '08', bubble: '因为加藤会为你提供提示的哦。' },
          { id: 'shy', label: '垂首侧眸·敞开心扉', icon: '🥺', motion: 'I_SAD_W', expression: 'F_SAD', voice: '03', bubble: '通过这次创作活动，慢慢向你敞开心扉……' },
          { id: 'heroine', label: '深情告白·第一女主', icon: '💖', motion: 'IDLING_03', expression: 'F_FUN', voice: '05', bubble: '我有没有成为只属于你的第一女主角呢？' },
          { id: 'gentle', label: '优雅微倾·二人回忆', icon: '☕', motion: 'I_FUN_S', expression: 'F_DOWN', voice: '06', bubble: '请尽情享受只属于我们两个人的回忆制作吧。' },
          { id: 'wander', label: '自由漫步·桌面溜达', icon: '🐾', kind: 'wander' }
        ],
        touch: {
          head: { motion: 'I_FUN_W', expression: 'F_FUN', voice: '05', voices: ['05', '06', '03', '02', '07'], bubble: '我有没有成为只属于你的第一女主角呢？' },
          body: { motion: 'I_SURPRISE_W', expression: 'F_SURPRISE', voice: '08', voices: ['08', '04', '01', '09', '10', '06'], bubble: '因为加藤会为你提供提示的哦。' },
          rage: { motion: 'I_ANGRY_W', expression: 'F_ANGRY', voice: '04', voices: ['04', '09', '10', '08'], bubble: '说不定会开始做出一些不可思议的举动呢。' }
        }
      },

      // 3. 惠惠（为美好的世界献上祝福！· 原版动画Live2D · 高桥李依爆裂原声）
      megumin: {
        title: '💥 惠惠爆裂百宝箱',
        wanderVoices: { start: '04', stop: '01' },
        actions: [
          { id: 'idle', label: '待机呼吸·乖乖待命', icon: '🌸', motion: 'bound', expression: '20_Expression_Smile_01', voice: '07', bubble: '这次邂逅乃世界之宿命。来吧，收下这起始之证吧！' },
          { id: 'tired', label: '苦思冥想·模仿台词', icon: '💫', motion: '00_Sad_01', expression: '20_Expression_Sad_01', voice: '01', bubble: '这里是以金钱为媒介向顾客提供物品的场所……嗯，有希的说话方式好难啊。' },
          { id: 'chant', label: '魔法手势·炽炎狂宴', icon: '🔮', motion: '00_Skill_01', expression: '20_Expression_Anger_01', voice: '02', bubble: '现在正是狂宴之时！来吧，炽炎升腾！' },
          { id: 'proud', label: '单手叉腰·得意夸耀', icon: '👑', motion: '00_Pride_01', expression: '20_Expression_Smile_01', voice: '08', bubble: '即便是魔王军干部，也绝非吾之爆裂魔法的敌手！' },
          { id: 'bound', label: '高举双手·开心欢呼', icon: '⭐', motion: '00_Happy_01', expression: '20_Expression_Smile_01', voice: '04', bubble: '来吧，今天也一起 Let\'s 爆裂吧！' },
          { id: 'magic', label: '单手扶帽·爆裂魅力', icon: '🔥', motion: '00_Skill_01', expression: '20_Expression_Serious_01', voice: '06', bubble: '你已经领悟到爆裂魔法的魅力了呢！' },
          { id: 'explosion', label: '高举法杖·爆裂魔法！', icon: '💥', motion: '00_Skill_02', expression: '20_Expression_Serious_01', voice: '10', bubble: '万物皆归于灰烬，自深渊降临吧！这就是人类最大威力的究极攻击魔法——Explosion！' },
          { id: 'wander', label: '自由漫步·桌面溜达', icon: '🐾', kind: 'wander' }
        ],
        touch: {
          head: { motion: '00_Shame_01', expression: '20_Expression_Shame_01', voice: '06', voices: ['06', '04', '07', '01', '03'], bubble: '你已经领悟到爆裂魔法的魅力了呢！' },
          body: { motion: '00_Pride_01', expression: '20_Expression_Serious_01', voice: '05', voices: ['05', '08', '02', '06', '04', '09'], bubble: '除了爆裂魔法之外，还有什么值得学习的技能吗？' },
          rage: { motion: '00_Anger_01', expression: '20_Expression_Anger_01', voice: '09', voices: ['09', '08', '02', '10'], bubble: '吾之爆裂魔法与梅露的雷电究竟孰强孰弱，迟早得做个了断呢。' }
        }
      },

      // 4. 蕾姆（Re:从零开始的异世界生活 · 原版高模3D VRM + 水濑祈26段CV声库）
      rem: {
        title: '💙 蕾姆专属百宝箱',
        wanderVoices: { start: '07', stop: '11' },
        actions: [
          { id: 'idle', label: '待机呼吸·备膳迎归', icon: '🌸', motion: 'idle', voice: '02', bubble: '我会做好饭菜等您的，请务必平安归来。' },
          { id: 'curtsey', label: '双手交叠·躬身致礼', icon: '👗', motion: 'flick_head', voice: '26', bubble: '我名叫蕾姆。从今天起，由我来负责全力辅佐您。' },
          { id: 'pray', label: '双手合十·体贴叮嘱', icon: '🙏', motion: 'tap_body', voice: '03', bubble: '请不要勉强自己，您的身体才是第一位的哦。' },
          { id: 'shy', label: '单手抚颊·温柔撒娇', icon: '🌸', motion: 'talk', voice: '18', bubble: '被这样温柔以待的话，蕾姆会忍不住想要撒娇的……' },
          { id: 'fist', label: '屈臂握拳·前倾助阵', icon: '👊', motion: 'tap_body', voice: '05', bubble: '蕾姆在战斗中也能派上用场，开路先锋之类的工作请尽管交给我吧。' },
          { id: 'happy', label: '双臂挥舞·笑着谈未来', icon: '✨', motion: 'flick_head', voice: '08', bubble: '谈论未来的话题时，要笑着说才行哦，对吧？' },
          { id: 'wander', label: '自由漫步·桌面溜达', icon: '🐾', kind: 'wander' }
        ],
        touch: {
          head: { motion: 'flick_head', voice: '18', voices: ['18', '25', '07', '08', '12', '03', '04'], bubble: '被这样温柔以待的话，蕾姆会忍不住想要撒娇的……' },
          body: { motion: 'tap_body', voice: '11', voices: ['11', '20', '17', '16', '01', '10', '14'], bubble: '在，请问有什么吩咐吗？' },
          rage: { motion: 'tap_body', voice: '19', voices: ['19', '22', '21', '23', '24'], bubble: '如果总是这样恶作剧的话，就连蕾姆也是会生气的哦？' }
        }
      },

      // 5. 初音未来（VOCALOID · 经典电子歌姬 · 藤田咲原声+PJSK官方CV声线）
      miku: {
        title: '🎵 初音未来百宝箱',
        wanderVoices: { start: '05', stop: '09' },
        actions: [
          { id: 'idle', label: '待机呼吸·歌姬待机', icon: '🌸', motion: 'miku_idle_01', voice: '06', bubble: '下一首歌也请多多指教哦！' },
          { id: 'shake', label: '甩双马尾·动感甩动', icon: '🎵', motion: 'miku_shake_01', voice: '02', bubble: '好想早点见到你呀！' },
          { id: 'wave', label: '躬身致意·元气招手', icon: '👋', motion: 'miku_m_01', voice: '03', bubble: '谢谢你能来！' },
          { id: 'heart', label: '左右晃动·舞台比心', icon: '💚', motion: 'miku_m_02', voice: '01', bubble: '谢谢你的应援！ ♪' },
          { id: 'shy', label: '歪头侧身·邀你共舞', icon: '🌸', motion: 'miku_m_03', voice: '05', bubble: '嘿嘿，那个呀，我们一起跳舞吧！' },
          { id: 'spin', label: '微仰节奏·舞台跃动', icon: '✨', motion: 'miku_m_04', voice: '04', bubble: '我想用歌声传递幸福！已经等不及下一场演唱会啦！' },
          { id: 'wander', label: '自由漫步·桌面溜达', icon: '🐾', kind: 'wander' }
        ],
        touch: {
          head: { motion: 'miku_m_03', voice: '01', voices: ['01', '02', '03', '05', '06'], bubble: '谢谢你的应援！ ♪' },
          body: { motion: 'miku_m_01', voice: '07', voices: ['07', '08', '10', '04', '05', '02'], bubble: '我要尽情高歌啦！' },
          rage: { motion: 'miku_shake_01', voice: '09', voices: ['09', '08', '07', '10'], bubble: '更新完成！ ✨' }
        }
      },

      // 6. 高木同学（擅长捉弄的高木同学 · 经典捉弄 · 高桥李依俏皮少女原声）
      takagi: {
        title: '🍂 高木同学百宝箱',
        wanderVoices: { start: '06', stop: '05' },
        actions: [
          { id: 'idle', label: '待机呼吸·乖乖待命', icon: '🌸', motion: 'Idle', expression: 'Neutral', voice: '05', bubble: '呐，现在是不是感觉我就在离你非常近的地方呀？像这样。' },
          { id: 'tease', label: '歪头坏笑·西片捉弄', icon: '😏', motion: 'Tease', expression: 'TeaseSmile', voice: '01', bubble: '你现在在看什么呢？哦～原来是在看我呀，这样啊～' },
          { id: 'wink', label: '侧首眨眼·单眼Wink', icon: '😉', motion: 'Tease', expression: 'Wink', voice: '02', bubble: '抱歉抱歉，不能再捉弄你了呢。' },
          { id: 'surprise', label: '张嘴吃惊·直球追问', icon: '😳', motion: 'Surprised', expression: 'Surprised', voice: '03', bubble: '呐，你是喜欢的吧？喜欢的话直接说喜欢不就好了嘛。' },
          { id: 'blush', label: '托腮凝视·害羞脸红', icon: '😳', motion: 'Poke', expression: 'Blush', voice: '09', bubble: '我喜欢西片哦。' },
          { id: 'sleep', label: '阖眼趴桌·午间小憩', icon: '💤', motion: 'Sleep', expression: 'Sleepy', voice: '05', bubble: '呐，现在是不是感觉我就在离你非常近的地方呀？像这样。' },
          { id: 'wakeup', label: '揉眼醒来·四目相对', icon: '🌤️', motion: 'WakeUp', expression: 'Neutral', voice: '06', bubble: '就算我走到这边来你也会看着我吗？啊，对上视线了，呵呵～' },
          { id: 'wander', label: '自由漫步·桌面溜达', icon: '🐾', kind: 'wander' }
        ],
        touch: {
          head: { motion: 'Poke', expression: 'Blush', voice: '06', voices: ['06', '09', '10', '05', '08'], bubble: '就算我走到这边来你也会看着我吗？啊，对上视线了，呵呵～' },
          body: { motion: 'Tease', expression: 'TeaseSmile', voice: '07', voices: ['07', '01', '03', '04', '02', '06'], bubble: '是因为你想去借别人忘在学校的伞对吧？（呜，被看穿了……）' },
          rage: { motion: 'Surprised', expression: 'Surprised', voice: '08', voices: ['08', '02', '07', '03'], bubble: '好开心呀～！没想到西片居然会主动邀请我共撑一把伞。' }
        }
      },

      // 7. 零二（DARLING in the FRANXX · 户松遥妖娆达令御姐原声）
      zerotwo: {
        title: '🍯 零二姿态百宝箱',
        wanderVoices: { start: '09', stop: '10' },
        actions: [
          { id: 'idle', label: '待机呼吸·乖乖待命', icon: '🌸', voice: '10', bubble: '只有你一个。' },
          { id: 'darling', label: '我的达令', icon: '🍭', voice: '01', bubble: '你就是我的达令！' },
          { id: 'tease', label: '调皮微笑', icon: '🍯', voice: '02', bubble: '我好像对你有点感兴趣呢，要不要成为我的达令？' },
          { id: 'lollipop', label: '叼棒棒糖', icon: '🍬', voice: '03', bubble: '这个又甜又好吃哦，一起吃吧？' },
          { id: 'flight', label: '鹤望兰号', icon: '🚀', voice: '04', bubble: '好好地驾驶成功了呢，刚才很棒哦。' },
          { id: 'pout', label: '略略略', icon: '😜', voice: '05', bubble: '真天真呢，不过我并不讨厌哦。' },
          { id: 'wander', label: '自由漫步·桌面溜达', icon: '🐾', kind: 'wander' }
        ],
        touch: {
          head: { voice: '06', voices: ['06', '10', '03', '09', '01'], bubble: '我也一直都是孤身一人哦，因为这对角的关系。' },
          body: { voice: '07', voices: ['07', '02', '04', '05', '09', '10'], bubble: '看吧，很简单对吧？' },
          rage: { voice: '08', voices: ['08', '05', '07'], bubble: '别一直死盯着我看啦。' }
        }
      },

      // 8. 雪之下雪乃（我的青春恋爱喜剧果然有问题 · 早见沙织清冷高雅毒舌大小姐原声）
      yukino: {
        title: '🐱 雪乃姿态百宝箱',
        wanderVoices: { start: '02', stop: '10' },
        actions: [
          { id: 'idle', label: '待机呼吸·乖乖待命', icon: '🌸', voice: '10', bubble: '你可以完全放心，好好休息吧。' },
          { id: 'read', label: '静心阅读', icon: '📖', voice: '01', bubble: '欢迎来到侍奉部，我很欢迎你哦。' },
          { id: 'sigh', label: '轻叹无奈', icon: '🐱', voice: '02', bubble: '既然受人所托，我就会尽到责任。' },
          { id: 'tea', label: '享用红茶', icon: '☕', voice: '03', bubble: '我会帮你矫正你的问题，心怀感激吧。' },
          { id: 'cat', label: '毒舌醒神', icon: '🐾', voice: '04', bubble: '真是惊讶，一看到你的脸，困意瞬间就一扫而空了呢。' },
          { id: 'smile', label: '冰融微笑', icon: '🌸', voice: '10', bubble: '你可以完全放心，好好休息吧。' },
          { id: 'wander', label: '自由漫步·桌面溜达', icon: '🐾', kind: 'wander' }
        ],
        touch: {
          head: { voice: '10', voices: ['10', '09', '01', '02', '05'], bubble: '你可以完全放心，好好休息吧。' },
          body: { voice: '07', voices: ['07', '04', '03', '06', '09', '02'], bubble: '和别人说话的时候，请看着对方的方向。' },
          rage: { voice: '06', voices: ['06', '03', '04', '07'], bubble: '我可是相当记仇的类型哦。' }
        }
      },

      // 9. 土间埋（干物妹！小埋 · 田中爱美原版CV原声声库 + 仓鼠斗篷Live2D）
      umaru: {
        title: '🐹 小埋干物妹百宝箱',
        wanderVoices: { start: '26', stop: '06' },
        actions: [
          { id: 'idle', label: '待机呼吸·仓鼠瘫倒', icon: '🐹', motion: 'umaru_idle', voice: '06', bubble: '在夏天有空调、冬天有被炉的小埋天堂里，悠闲地懒散度日吧！' },
          { id: 'cola', label: '开怀畅饮·零食绝配', icon: '🥤', motion: 'rita_Live2D_001', voice: '05', bubble: '薯片和巧克力的搭配虽然棒极了，但芝士和鱿鱼的搭配也无可挑剔呢！' },
          { id: 'game', label: '全服第一·痛快通关', icon: '🎮', motion: 'rita_Live2D_004', voice: '04', bubble: '好慢！太慢了啦哥哥！不陪小埋打个痛快游戏的话，我可不原谅你哦！' },
          { id: 'roll', label: '毛毛虫式·满地打滚', icon: '🌀', motion: 'rita_Live2D_008', voice: '15', bubble: '好啦好啦，再睡10分钟就好……有什么关系嘛，哥哥今天也休息一天嘛……' },
          { id: 'pout', label: '鼓嘴撒娇·要买漫画', icon: '😤', motion: 'rita_Live2D_021', voice: '03', bubble: '帮我买漫画回来嘛，哥哥！好想看、好想看、好想看嘛——！' },
          { id: 'happy', label: '手舞足蹈·欢呼雀跃', icon: '✨', motion: 'rita_Live2D_010', voice: '19', bubble: '谢谢你，哥哥！今天工作也要加油哦！' },
          { id: 'wander', label: '自由漫步·桌面溜达', icon: '🐾', kind: 'wander' }
        ],
        touch: {
          head: { motion: 'rita_Live2D_002', voice: '10', voices: ['10', '11', '19', '13', '02', '35', '26'], bubble: '哥哥！嘿嘿，只是试着叫一下而已！' },
          body: { motion: 'rita_Live2D_005', voice: '17', voices: ['17', '18', '12', '09', '14', '20', '07'], bubble: '啊嘻、哇哈哈哈！等、等一下！都、都说好痒了啦！' },
          rage: { motion: 'rita_Live2D_022', voice: '23', voices: ['23', '08', '24', '21', '20', '12'], bubble: '呜哇啊啊啊！笨蛋哥哥！你干什么呀！' }
        }
      }
    };
  }

  /** 获取指定角色与语音编号的 100% 精准音文对应台词 */
  getVoiceTranscript(charId, voiceId) {
    const id = charId || window.characterManager?.getCurrentCharacter()?.id || 'ruoxi';
    const vKey = String(voiceId || '01').padStart(2, '0');
    return this.VOICE_TRANSCRIPTS[id]?.[vKey] || null;
  }

  /** 从角色的触碰语音池中不重复循环抽取下一段语音（洗牌袋机制，彻底杜绝连续点出同一段语音） */
  _pickTouchVoice(charId, touchKey, touchConfig) {
    const id = charId || 'ruoxi';
    const pool = (Array.isArray(touchConfig?.voices) && touchConfig.voices.length > 0)
      ? touchConfig.voices
      : (touchConfig?.voice ? [touchConfig.voice] : ['01']);

    if (pool.length === 1) {
      this._lastTouchVoice[id] = pool[0];
      return pool[0];
    }

    const queueKey = `${id}_${touchKey}`;
    if (!Array.isArray(this._touchVoiceQueues[queueKey]) || this._touchVoiceQueues[queueKey].length === 0) {
      // 洗牌生成新一轮不重复序列
      const shuffled = [...pool];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      // 若队首恰好与该角色上一次刚播过的语音相同，则与队尾交换，确保跨轮/跨部位点击也绝不连续重复
      if (shuffled.length > 1 && shuffled[0] === this._lastTouchVoice[id]) {
        const lastIdx = shuffled.length - 1;
        [shuffled[0], shuffled[lastIdx]] = [shuffled[lastIdx], shuffled[0]];
      }
      this._touchVoiceQueues[queueKey] = shuffled;
    }

    let picked = this._touchVoiceQueues[queueKey].shift();
    if (picked === this._lastTouchVoice[id] && this._touchVoiceQueues[queueKey].length > 0) {
      const nextPicked = this._touchVoiceQueues[queueKey].shift();
      this._touchVoiceQueues[queueKey].push(picked);
      picked = nextPicked;
    }
    this._lastTouchVoice[id] = picked;
    return picked;
  }

  /** 获取指定角色的动作列表 */
  getCharacterActions(charId) {
    const id = charId || window.characterManager?.getCurrentCharacter()?.id || 'ruoxi';
    return this.ACTION_DATABASE[id] || this.ACTION_DATABASE.ruoxi;
  }

  /** 动态渲染动作百宝箱 UI */
  renderMenu(containerId, charId, onActionSelect) {
    const menu = document.getElementById(containerId || 'pet-action-menu');
    if (!menu) return;

    const id = charId || window.characterManager?.getCurrentCharacter()?.id || 'ruoxi';
    const data = this.getCharacterActions(id);

    const isWandering = !!window.app?.petMode?._wanderActive;
    menu.innerHTML = `
      <div class="pet-action-title">${data.title}</div>
      <div class="pet-action-grid">
        ${data.actions.map(act => {
          const isWanderBtn = act.id === 'wander' || act.kind === 'wander';
          const label = (isWanderBtn && isWandering) ? '停止漫步·原地待命' : act.label;
          const activeStyle = (isWanderBtn && isWandering) ? 'style="border-color:#ff4757;background:rgba(255,71,87,0.12);color:#d63031;font-weight:bold;"' : '';
          return `
          <button class="pet-action-item" data-action="${act.id}" ${activeStyle}>
            <span class="action-icon">${act.icon}</span>${label}
          </button>`;
        }).join('')}
      </div>
      <div class="pet-action-footer" style="display:flex;gap:4px;margin-top:8px;padding-top:6px;border-top:1px dashed rgba(217,79,79,0.2);">
        <button class="pet-action-footer-btn btn-toggle-pomodoro-from-menu" style="flex:1;padding:5px 4px;font-size:11px;border-radius:6px;border:1px solid rgba(255,107,107,0.4);background:rgba(255,107,107,0.1);cursor:pointer;color:#d94f4f;display:flex;align-items:center;justify-content:center;gap:2px;">
          <span>💼</span> 番茄钟
        </button>
        <button class="pet-action-footer-btn btn-open-scale-from-menu" style="flex:1;padding:5px 4px;font-size:11px;border-radius:6px;border:1px solid rgba(217,79,79,0.25);background:rgba(255,255,255,0.9);cursor:pointer;color:#b83a3a;display:flex;align-items:center;justify-content:center;gap:2px;">
          <span>📐</span> 大小
        </button>
        <button class="pet-action-footer-btn btn-open-shortcuts-from-menu" style="flex:1;padding:5px 4px;font-size:11px;border-radius:6px;border:1px solid rgba(217,79,79,0.25);background:rgba(255,255,255,0.9);cursor:pointer;color:#b83a3a;display:flex;align-items:center;justify-content:center;gap:2px;">
          <span>⌨️</span> 快捷键
        </button>
        <button class="pet-action-footer-btn btn-exit-pet-from-menu" style="flex:1;padding:5px 4px;font-size:11px;border-radius:6px;border:1px solid #d94f4f;background:#d94f4f;color:#fff;cursor:pointer;font-weight:bold;display:flex;align-items:center;justify-content:center;gap:2px;">
          <span>🔄</span> 网页
        </button>
      </div>
    `;

    // 重新绑定点击事件
    menu.onclick = (e) => {
      e.stopPropagation();
      if (e.target.closest('.btn-toggle-pomodoro-from-menu')) {
        window.app?.petMode?._toggleActionMenu?.(false);
        menu.classList.remove('show');
        window.desktopButler?.togglePomodoro?.();
        return;
      }
      if (e.target.closest('.btn-open-scale-from-menu')) {
        window.app?.petMode?._toggleActionMenu?.(false);
        menu.classList.remove('show');
        window.app?.petMode?._toggleScaleMenu?.(true);
        return;
      }
      if (e.target.closest('.btn-open-shortcuts-from-menu')) {
        window.app?.petMode?._toggleActionMenu?.(false);
        menu.classList.remove('show');
        window.shortcutManager?.toggleMenu?.(true);
        return;
      }
      if (e.target.closest('.btn-exit-pet-from-menu')) {
        window.app?.petMode?._toggleActionMenu?.(false);
        menu.classList.remove('show');
        window.app?.petMode?.exit?.(true);
        return;
      }
      const item = e.target.closest('.pet-action-item');
      if (!item) return;
      const actionId = item.dataset.action;
      if (onActionSelect) {
        onActionSelect(actionId);
      } else {
        this.executeAction(id, actionId);
      }
    };
  }

  /** 智能解析并分发 Live2D 模型动作（跨 Cubism 2 / 3 / 4 自动索引，强制 Priority.FORCE=3 大幅度动作立即播放） */
  playModelMotion(model, motionName) {
    if (!model) return false;
    if (!motionName) return false;

    const mm = model.internalModel?.motionManager;
    const target = motionName.toLowerCase();

    // 1. 深度遍历 definitions（支持文件名、无组名空字符串 group 等）
    if (mm && mm.definitions) {
      for (const [group, list] of Object.entries(mm.definitions)) {
        if (!Array.isArray(list)) continue;
        for (let i = 0; i < list.length; i++) {
          const item = list[i];
          const file = (item?.file || item?.File || item?.name || item?.Name || '').toLowerCase();
          const baseName = file.split('/').pop().replace(/\.(mtn|motion3\.json)$/i, '');
          if (baseName === target || file.includes(target) || target.includes(baseName)) {
            try {
              // ★ 关键突破：以最高优先级 3 (FORCE) 强制启动，绝不被待机动作压制！
              mm.startMotion(group, i, 3);
              return true;
            } catch (e) {
              console.warn('[Live2D] startMotion 异常:', e);
            }
          }
        }
      }

      // 2. 尝试动作组直接匹配
      if (motionName in mm.definitions) {
        try {
          mm.startMotion(motionName, 0, 3);
          return true;
        } catch (e) {}
      }
    }

    // 3. 原生 model.motion 兜底（显式指定优先级 3）
    if (typeof model.motion === 'function') {
      try {
        const ok = model.motion(motionName, 0, 3);
        if (ok !== false && ok !== undefined) return true;
      } catch (e) {}
    }

    return false;
  }

  /** 智能解析并分发 Live2D 模型表情（支持表情名称、文件名与定义索引） */
  playModelExpression(model, expName) {
    if (!model) return false;
    if (!expName) return false;

    const em = model.internalModel?.motionManager?.expressionManager;
    if (em && Array.isArray(em.definitions)) {
      const target = expName.toLowerCase();
      for (let i = 0; i < em.definitions.length; i++) {
        const item = em.definitions[i];
        const name = (item?.name || item?.Name || item?.file || item?.File || '').toLowerCase();
        const baseName = name.split('/').pop().replace(/\.exp(\.json)?$/i, '');
        if (name === target || baseName === target || name.includes(target)) {
          try {
            em.setExpression(i);
            return true;
          } catch (e) {}
        }
      }
    }

    if (typeof model.expression === 'function') {
      try {
        const res = model.expression(expName);
        if (res !== false && res !== undefined) return true;
      } catch (e) {}
    }
    return false;
  }

  /** 自由漫步启停时的专属音文同步反馈 */
  playWanderFeedback(charId, isWandering) {
    const id = charId || window.characterManager?.getCurrentCharacter()?.id || 'ruoxi';
    const petMode = window.app?.petMode;
    const data = this.getCharacterActions(id);
    const v = isWandering ? (data.wanderVoices?.start || '04') : (data.wanderVoices?.stop || '01');

    if (window.characterManager?.playVoice) {
      window.characterManager.playVoice(id, v);
    }
    this._lastTouchVoice[id] = v;

    const transcript = this.getVoiceTranscript(id, v);
    if (id === 'ruoxi') {
      petMode?._showBubble?.(transcript || (isWandering ? '好耶，若曦可以在主人的桌面上尽情溜达啦！ 🐾' : '乖乖待命呼吸中，随时听候主人差遣。 🌸'));
    } else {
      const prefix = isWandering ? '🐾 [开启漫步] ' : '🌸 [原地待命] ';
      petMode?._showBubble?.(prefix + (transcript || (isWandering ? '出发去桌面上溜达咯～' : '漫步结束，乖乖待命啦～')));
    }
  }

  /** 执行具体动作 */
  executeAction(charId, actionId, context) {
    const id = charId || window.characterManager?.getCurrentCharacter()?.id || 'ruoxi';
    const petMode = window.app?.petMode;

    // 0. 自由漫步优先直达（避免被后续通用气泡/语音覆盖或二次反转）
    if (actionId === 'wander') {
      petMode?._toggleWander?.();
      return true;
    }

    const data = this.getCharacterActions(id);
    const act = data.actions.find(a => a.id === actionId);
    if (!act) return;

    if (act.kind === 'wander') {
      petMode?._toggleWander?.();
      return true;
    }

    // ★ 核心修复：只要用户选择了任何非漫步动作（例如「待机呼吸」或其他任何姿态），若当前处于桌面漫步状态，立即停止漫步恢复原地常态！
    if (petMode?._wanderActive) {
      petMode._stopWander();
    }

    const model = context?.model || petMode?._model;

    // 1. 若曦精灵表角色
    if (act.kind === 'sprite' || (id === 'ruoxi' && window.spriteAtlasManager)) {
      if (petMode?._spriteCall) {
        petMode._spriteCall(act.id);
        return true;
      } else if (window.spriteAtlasManager && typeof window.spriteAtlasManager[act.method] === 'function') {
        window.spriteAtlasManager[act.method]();
      }
    }
    // 3. VRM 动作分发
    else if (act.vrmAnim || petMode?._renderMode === 'vrm' || window.vrmManager?.vrm) {
      if (window.vrmManager) {
        window.vrmManager.playAnimation?.(act.vrmAnim || (act.id === 'idle' ? 'idle' : 'tap'));
      }
    }
    // 4. Live2D 动作分发
    else if (model) {
      if (act.id === 'idle' && !act.motion) {
        this.playIdle(id, { model });
      } else if (act.motion) {
        if (!this.playModelMotion(model, act.motion) && act.id === 'idle') {
          this.playIdle(id, { model });
        }
      }
      if (act.expression) {
        this.playModelExpression(model, act.expression);
      }
    }

    // 5. 气泡台词展示（严格对齐当前播放的音频原句翻译）
    const exactBubble = (act.voice && this.getVoiceTranscript(id, act.voice)) || act.bubble;
    if (exactBubble && petMode?._showBubble) {
      petMode._showBubble(exactBubble);
    }

    // 6. 原生语音联动（全角色支持）
    if (act.voice && window.characterManager?.playVoice) {
      this._lastTouchVoice[id] = String(act.voice).padStart(2, '0');
      window.characterManager.playVoice(id, act.voice);
    } else if (window.characterManager?.playRandomVoice) {
      window.characterManager.playRandomVoice(id);
    }
    return true;
  }

  /** 触碰交互处理（摸头/戳身/连续狂点暴走 · 多语音不重复循环 + 100%音文同步） */
  handleTouch(charId, part, clickCount, context) {
    const id = charId || window.characterManager?.getCurrentCharacter()?.id || 'ruoxi';
    const data = this.getCharacterActions(id);
    const petMode = window.app?.petMode;
    const model = context?.model || petMode?._model;

    const touchKey = (part === 'rage' || clickCount >= 4) ? 'rage' : (part === 'head' ? 'head' : 'body');
    const touch = data.touch?.[touchKey] || data.touch?.body;
    if (!touch) return null;

    // 1. 精灵表角色
    if (id === 'ruoxi' && window.spriteAtlasManager) {
      if (touch.method && typeof window.spriteAtlasManager[touch.method] === 'function') {
        window.spriteAtlasManager[touch.method]();
      }
    }
    // 2. VRM 角色
    else if (touch.vrmAnim || petMode?._renderMode === 'vrm' || window.vrmManager?.vrm) {
      if (window.vrmManager) {
        window.vrmManager.playAnimation?.(touch.vrmAnim || 'tap');
      }
    }
    // 3. Live2D 角色
    else if (model) {
      if (touch.motion) {
        this.playModelMotion(model, touch.motion);
      }
      if (touch.expression) {
        this.playModelExpression(model, touch.expression);
      }
    }

    // 4. 从当前角色的触碰语音池中不重复抽取下一条语音
    const pickedVoice = this._pickTouchVoice(id, touchKey, touch);
    const matchedBubble = this.getVoiceTranscript(id, pickedVoice) || touch.bubble;

    // 5. 播放选中的 CV 语音
    if (pickedVoice && window.characterManager?.playVoice) {
      window.characterManager.playVoice(id, pickedVoice);
    } else if (window.characterManager?.playRandomVoice) {
      window.characterManager.playRandomVoice(id);
    }

    // 6. 显示与该段音频 100% 匹配的台词气泡
    if (matchedBubble && petMode?._showBubble && !context?.suppressPetBubble) {
      petMode._showBubble(matchedBubble);
    }

    return {
      voice: pickedVoice,
      text: matchedBubble,
      touchKey
    };
  }

  /** 出场自动待机呼吸与眨眼 */
  playIdle(charId, context) {
    const id = charId || window.characterManager?.getCurrentCharacter()?.id;
    const model = context?.model || window.app?.petMode?._model;
    if (!model || typeof model.motion !== 'function') return;

    const idleMap = {
      megumi: 'IDLING_01',
      megumin: 'bound',
      rem: 'Live2D_remu_idle',
      miku: 'miku_idle_01',
      takagi: 'Idle'
    };
    const preferred = idleMap[id];
    if (preferred && this.playModelMotion(model, preferred)) return;

    const idleCandidates = ['idle', 'Idle', 'IDLING_01', 'Live2D_remu_idle', 'miku_idle_01', 'null', ''];
    for (const anim of idleCandidates) {
      try {
        const ok = model.motion(anim);
        if (ok !== false && ok !== undefined) break;
      } catch (e) {}
    }
  }
}

// 全局单例挂载
window.actionMenuManager = new ActionMenuManager();
