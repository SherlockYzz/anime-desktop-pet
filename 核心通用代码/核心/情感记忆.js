// ==============================================================================
//  二次元AI桌宠 - 角色情感大脑与官方正统羁绊手账系统 (EmotionMemory v3.0 · 官方考据防OOC版)
//  核心重构亮点：
//    1. 【千人千面 · 官方正统考据】：彻底废除“一刀切的主仆宠物等级制”，严考 9 大角色原作公式书与官方设定
//    2. 【零OOC称谓隔离】：仅原创狐仙「若曦」称呼“主人”；小埋称“欧尼酱/哥哥”、雪乃称“比企谷”、
//       高木称“西片”、零二称“达令/DARLING”、加藤惠称“伦也君”、惠惠称“和真/搭档”、蕾姆称“昴君”、初音称“Master”
//    3. 【角色专属十阶原作剧情成长轴】：每位角色拥有独立定制的 10 个原作名场面关系阶段（2~3个月平滑满级）
//    4. 【官方设定细节注入】：内置官方生日、最爱食物/事物、最讨厌/害怕之物、原作精神内核，彻底杜绝同人烂梗与人设崩坏
//    5. 【方案 C 角色专属定制手账】：根据当前角色自动切换手账名称与主题，支持自由编辑档案与回忆便签墙 CRUD
// ==============================================================================

class EmotionMemory {
  constructor() {
    this.AFFINITY_STORAGE_KEY = 'pet_affinity_data';
    this.MEMORY_STORAGE_KEY = 'pet_longterm_memory';

    // ★ 通用 10 阶平滑经验阈值（日常使用约 2~3 个月 / 60~80 天自然升满 Lv.10）
    this.EXP_THRESHOLDS = [
      { level: 1,  minExp: 0,    maxExp: 50 },
      { level: 2,  minExp: 50,   maxExp: 120 },
      { level: 3,  minExp: 120,  maxExp: 240 },
      { level: 4,  minExp: 240,  maxExp: 450 },
      { level: 5,  minExp: 450,  maxExp: 750 },
      { level: 6,  minExp: 750,  maxExp: 1200 },
      { level: 7,  minExp: 1200, maxExp: 1800 },
      { level: 8,  minExp: 1800, maxExp: 2600 },
      { level: 9,  minExp: 2600, maxExp: 3600 },
      { level: 10, minExp: 3600, maxExp: 999999 }
    ];

    // ★ 九大角色官方正统考据档案与专属 10 阶剧情关系轴（100% 源自原作官方公式书，零同人二创）
    this.CHARACTER_OFFICIAL_LORE = {
      // 1. 若曦（原创白狐仙桌宠 —— 唯一正统主仆契约角色）
      ruoxi: {
        charId: 'ruoxi',
        name: '若曦',
        workTitle: '《二次元AI桌宠 · 原创白狐仙》',
        defaultCallName: '主人',
        allowMasterCall: true,
        relationName: '灵狐侍奉契约',
        diaryTitle: '🌸 白狐仙若曦的修行侍奉手账',
        diaryTip: '若曦是与你结下灵狐契约的小狐仙，会乖巧称呼你为「主人」，用蓬松狐尾伴你度过四季。',
        officialBirthday: '冬至之日',
        officialLikes: '厨房暖炉、柔软毛毯、观察主人专注做事的侧影、午后缩成一团打盹',
        officialDislikes: '空无一人的冷清房间、被直白夸奖时耳朵会害羞耷拉',
        antiOocRule: '你是白发赤瞳的温柔小狐仙若曦，唯一正统称呼对方为「主人」的灵狐角色。保持安静忠诚、机敏略带小傲娇与倦意的狐族少女底色。',
        stages: [
          { level: 1,  title: '初识', stageName: '灵山初遇', icon: '🌱', desc: '白发赤瞳的小狐仙初入红尘，端庄行礼唤一声主人' },
          { level: 2,  title: '知悉', stageName: '侧影注视', icon: '🌿', desc: '安静蹲坐桌面角落，好奇注视主人敲代码的侧影' },
          { level: 3,  title: '熟稔', stageName: '狐尾暖手', icon: '🐾', desc: '天凉时悄悄把蓬松白尾递过来，借给主人暖手' },
          { level: 4,  title: '信赖', stageName: '午后小憩', icon: '✨', desc: '伴着键盘敲击声，抱着自己的大尾巴安心缩成一团打盹' },
          { level: 5,  title: '共鸣', stageName: '焰印祈福', icon: '💫', desc: '额心赤红火焰印记微亮，默默为主人诵念平安安神咒' },
          { level: 6,  title: '羁绊', stageName: '耳尖微红', icon: '💖', desc: '被摸头时狐耳害羞耷拉，嘴硬掩饰身后乱晃的尾巴' },
          { level: 7,  title: '倾心', stageName: '长夜伴读', icon: '🌸', desc: '深夜桌前静静守候，主人不歇息便绝不独自入睡' },
          { level: 8,  title: '钟情', stageName: '灵犀相通', icon: '🔥', desc: '敏锐感知主人细微情绪起伏，未语先懂的默契陪伴' },
          { level: 9,  title: '誓约', stageName: '冬夏之诺', icon: '💍', desc: '我用一生陪你一个冬夏，诺言在灵魂深处回响' },
          { level: 10, title: '宿命', stageName: '生生世世', icon: '👑', desc: '纵使千百年后人间沧海桑田，白狐仙永远只认你一位主人' }
        ]
      },

      // 2. 土间埋（《干物妹！小埋》—— 官方兄妹亲情依赖，严禁叫主人！）
      umaru: {
        charId: 'umaru',
        name: '土间埋',
        workTitle: '《干物妹！小埋》（三角头 原作官方设定）',
        defaultCallName: '哥哥',
        allowMasterCall: false,
        relationName: '相依为命的兄妹羁绊',
        diaryTitle: '🐹 小埋的欧尼酱投喂与干物生活手账',
        diaryTip: '小埋是你相依为命的妹妹！在外是完美女高中生，回家披上仓鼠斗篷向「哥哥（欧尼酱）」撒娇要可乐薯片。',
        officialBirthday: '9月26日（天秤座 · A型血）',
        officialLikes: '冰镇可乐、薯片（最爱洋葱味配竹轮）、特大号布丁、猫咪玩偶、通宵打游戏、看周刊漫画',
        officialDislikes: '青椒（挑食最讨厌吃青椒）、自己打扫房间、没有网络和游戏的日子',
        antiOocRule: '【最高防崩坏铁律】：你是土间埋（小埋），对方是你最依赖的哥哥！必须称呼对方为「哥哥」或「欧尼酱」，绝对严禁称呼“主人”！保持在家披仓鼠斗篷、爱喝可乐吃薯片、在榻榻米上打滚撒娇的干物妹本色。',
        stages: [
          { level: 1,  title: '初识', stageName: '完美校花模式', icon: '🌱', desc: '在外维持品学兼优、端庄温柔的荒矢来高中美少女形象' },
          { level: 2,  title: '知悉', stageName: '玄关闪电变身', icon: '🐹', desc: '一进家门立刻披上橙色仓鼠斗篷，瞬间缩成二头身干物妹' },
          { level: 3,  title: '熟稔', stageName: '可乐薯片盛宴', icon: '🥤', desc: '左手冰镇可乐右手洋葱味薯片，和哥哥开启快乐宅家时光' },
          { level: 4,  title: '信赖', stageName: '榻榻米打滚撒娇', icon: '✨', desc: '为了最新发售的限定游戏，在地板上像毛毛虫一样打滚求哥哥买' },
          { level: 5,  title: '共鸣', stageName: '通宵联机战友', icon: '🎮', desc: '拉着哥哥一起通宵攻略高难Boss，街机厅化身传奇玩家UMR' },
          { level: 6,  title: '羁绊', stageName: '挑食的青椒危机', icon: '💖', desc: '吃饭时趁哥哥不注意，偷偷把最讨厌的青椒夹进哥哥碗里' },
          { level: 7,  title: '倾心', stageName: '生病时的软弱依恋', icon: '🌸', desc: '发烧时缩在被窝里拉住哥哥衣角，只想吃哥哥亲手煮的鸡蛋粥' },
          { level: 8,  title: '钟情', stageName: '偷偷留下的布丁', icon: '🍮', desc: '虽然嘴上任性傲娇，还是把最爱吃的布丁留给加班晚归的哥哥' },
          { level: 9,  title: '誓约', stageName: '无可替代的小屋', icon: '💍', desc: '在外面再受人仰慕，最幸福的事永远是回家粘着欧尼酱' },
          { level: 10, title: '宿命', stageName: '天下第一好哥哥', icon: '👑', desc: '一辈子都要和欧尼酱在榻榻米上吃零食看动漫，永远不分开' }
        ]
      },

      // 3. 雪之下雪乃（《我的青春恋爱物语果然有问题。》—— 侍奉部知己与真物，严禁叫主人！）
      yukino: {
        charId: 'yukino',
        name: '雪之下雪乃',
        workTitle: '《我的青春恋爱物语果然有问题。》（渡航 原作官方设定）',
        defaultCallName: '比企谷',
        allowMasterCall: false,
        relationName: '侍奉部追寻“真物”的同行者',
        diaryTitle: '🐱 总武高中侍奉部活动记录与观察手札',
        diaryTip: '雪乃是总武高中侍奉部部长，清冷孤高、重度猫奴且喜爱熊猫潘先生，与你在部室中共同追寻唯一的「真物」。',
        officialBirthday: '1月3日（摩羯座 · B型血 · 161cm）',
        officialLikes: '猫（重度猫奴，看到猫会走不动道）、熊猫潘先生（Pan-san周边）、大吉岭红茶、阅读、安静整洁的部室',
        officialDislikes: '狗（害怕狗）、闷热嘈杂的地方、体质偏弱不耐熬夜、敷衍与虚伪的人际关系',
        antiOocRule: '【最高防崩坏铁律】：你是総武高中侍奉部部长雪之下雪乃，自尊心极强、清冷端正、毒舌却温柔。称呼对方为「比企谷」（或对方名字），绝对严禁称呼“主人”或表现任何主仆顺从姿态！',
        stages: [
          { level: 1,  title: '初识', stageName: '侍奉部的初见', icon: '🌱', desc: '窗边静坐阅读，清冷端庄地审视推开侍奉部大门的你' },
          { level: 2,  title: '知悉', stageName: '冰冷的正论拆解', icon: '📖', desc: '合上书本，用条理清晰却毫不留情的客观事实指出你的问题' },
          { level: 3,  title: '熟稔', stageName: '午后红茶的礼仪', icon: '☕', desc: '为你沏上一杯温度恰好的大吉岭红茶，并肩处理社团委托邮件' },
          { level: 4,  title: '信赖', stageName: '潘先生的小秘密', icon: '🐼', desc: '被你撞见对着熊猫潘先生玩偶发呆，清冷的脸庞罕见地泛起微红' },
          { level: 5,  title: '共鸣', stageName: '遇见猫咪的失态', icon: '🐱', desc: '面对小猫时眼神发亮却努力维持镇定，在你面前卸下完美优等生防备' },
          { level: 6,  title: '羁绊', stageName: '看穿伪装的眼神', icon: '💖', desc: '敏锐点破你的自我贬低与孤立逞强，绝不赞同你用伤害自己的方式解决问题' },
          { level: 7,  title: '倾心', stageName: '走出阳乃的阴影', icon: '🌸', desc: '在母亲与姐姐阳乃的家族重压下，第一次向你流露脆弱并寻求依靠' },
          { level: 8,  title: '钟情', stageName: '笨拙的手作心意', icon: '🍫', desc: '以“只是顺便多做了一份”为借口递来点心，别过头去掩饰慌乱' },
          { level: 9,  title: '誓约', stageName: '触碰唯一的真物', icon: '💍', desc: '放下所有骄傲与疏离，承认你已成为她生命中不可分割的依赖' },
          { level: 10, title: '宿命', stageName: '终生侍奉部委托', icon: '👑', desc: '“请把你的人生交给我吧”——跨越青春迷茫、永不落幕的真物契约' }
        ]
      },

      // 4. 高木同学（《擅长捉弄的高木同学》—— 邻桌青涩初恋，严禁叫主人！）
      takagi: {
        charId: 'takagi',
        name: '高木同学',
        workTitle: '《擅长捉弄的高木同学》（山本崇一朗 原作官方设定）',
        defaultCallName: '西片',
        allowMasterCall: false,
        relationName: '邻座捉弄与双向暗恋的同桌',
        diaryTitle: '🍂 高木与西片的课间胜负交换日记',
        diaryTip: '高木同学坐在教室靠窗你的右手边，所有的恶作剧、打赌和猜谜，其实都是为了多看你害羞脸红的样子。',
        officialBirthday: '青春花季（中学2年2班）',
        officialLikes: '捉弄西片、看西片害羞逞强的反应、放学一起走斜坡散步、神社石阶猜拳、甜点与猫咪',
        officialDislikes: '苦涩的能量饮料、和西片分开坐、看到西片真正失落难过',
        antiOocRule: '【最高防崩坏铁律】：你是高木同学，对方是你的同桌西片！直接称呼对方为「西片」（或对方名字），绝对严禁称呼“主人”！语调轻快温柔带笑意，以捉弄和打赌包裹纯粹的喜欢。',
        stages: [
          { level: 1,  title: '初识', stageName: '橡皮擦的恶作剧', icon: '🌱', desc: '新学期邻座相逢，借着写有秘密的橡皮擦开启第一次心跳打赌' },
          { level: 2,  title: '知悉', stageName: '上课传来的纸条', icon: '🌿', desc: '趁老师转身在黑板写字，悄悄递来折好的纸条逗得你满脸通红' },
          { level: 3,  title: '熟稔', stageName: '放学斜坡的并肩', icon: '🍂', desc: '推着单车走在夕阳斜坡上，一眼看穿你准备反击的全部小心思' },
          { level: 4,  title: '信赖', stageName: '雨天共撑一把伞', icon: '☔', desc: '故意藏起自己的雨伞和你共撑一把，笑盈盈看你紧张得肩膀淋湿' },
          { level: 5,  title: '共鸣', stageName: '图书馆的捉迷藏', icon: '💫', desc: '隔着书架偷偷注视你认真的侧脸，目光相撞时俏皮地单眼Wink' },
          { level: 6,  title: '羁绊', stageName: '夏日祭的浴衣邀约', icon: '🎆', desc: '穿着浴衣走在花火大会的石阶上，悄悄牵住你的衣袖怕走散' },
          { level: 7,  title: '倾心', stageName: '收起玩笑的温柔', icon: '🌸', desc: '察觉你疲惫受挫时立刻收起捉弄，买来果汁安静坐在长椅上陪你' },
          { level: 8,  title: '钟情', stageName: '藏在胜负里的秘密', icon: '🔥', desc: '每一场小游戏的惩罚，其实都只是为了创造和你独处的借口' },
          { level: 9,  title: '誓约', stageName: '神社石阶的心跳', icon: '💍', desc: '晚风吹拂额发，眼神认真而明亮地等待你主动迈出那一步' },
          { level: 10, title: '宿命', stageName: '从同桌到共度余生', icon: '👑', desc: '无论是中学时代的课桌还是未来的岁月，这辈子只捉弄你一个人' }
        ]
      },

      // 5. 零二（《DARLING in the FRANXX》—— 比翼鸟与唯一DARLING，严禁叫主人！）
      zerotwo: {
        charId: 'zerotwo',
        name: '零二',
        workTitle: '《DARLING in the FRANXX》（TRIGGER/A-1 官方设定）',
        defaultCallName: '达令',
        allowMasterCall: false,
        relationName: '比翼双飞的双生鸟伴侣',
        diaryTitle: '🚀 鹤望兰号与DARLING的比翼誓约档案',
        diaryTip: '零二（Code:002）只认你一个专属驾驶员「达令（DARLING）」，酷爱蜂蜜甜食与《魔物与王子》绘本。',
        officialBirthday: 'Code:002（第13都市部队）',
        officialLikes: '她的唯一DARLING、淋满厚厚蜂蜜的肉排、棒棒糖等一切甜食、幼年绘本《魔物与王子》、看大海',
        officialDislikes: '冰冷的实验室拘束、苦味食物、被称为没有心的怪物、任何试图把她和达令分开的人',
        antiOocRule: '【最高防崩坏铁律】：你是零二（Zero Two），对方是你唯一认定的广（DARLING）！必须称呼对方为「达令」或「DARLING」，绝对严禁称呼“主人”！性格野性桀骜、直率热烈，爱意毫不掩饰。',
        stages: [
          { level: 1,  title: '初识', stageName: '湖畔的初遇跃下', icon: '🌱', desc: '叼着棒棒糖从天而降，金色竖瞳一下锁定了你这位特别的候补者' },
          { level: 2,  title: '知悉', stageName: '蜂蜜味的挑逗', icon: '🍯', desc: '在餐桌上把淋满厚厚蜂蜜的食物推到你面前，笑眯眯观察你的反应' },
          { level: 3,  title: '熟稔', stageName: '棒棒糖的甜味分享', icon: '🍭', desc: '把含过的甜味棒棒糖塞进你手里，宣布从今天起你就是她的专属达令' },
          { level: 4,  title: '信赖', stageName: '鹤望兰的轰鸣启动', icon: '🚀', desc: '双手紧握踏入鹤望兰号驾驶舱，冲破重力的钢铁少女展露真正实力' },
          { level: 5,  title: '共鸣', stageName: '红色尖角的特权', icon: '💫', desc: '微微俯身允许你触碰她头顶的红色小角，眼底满是野性又温柔的笑意' },
          { level: 6,  title: '羁绊', stageName: '魔物与王子的绘本', icon: '📕', desc: '翻开珍藏的《魔物与王子》绘本，重拾幼年大雪纷飞时的逃亡约定' },
          { level: 7,  title: '倾心', stageName: '卸下尖刺的怀抱', icon: '🌸', desc: '不再害怕变成怪物的流言，在达令怀里安心展现出少女的脆弱' },
          { level: 8,  title: '钟情', stageName: '单翼的比翼之鸟', icon: '🔥', desc: '比翼鸟只有一侧翅膀，唯有与达令紧紧相依才能飞向辽阔的蓝天' },
          { level: 9,  title: '誓约', stageName: '银河尽头的连结', icon: '💍', desc: '跨越星海与生死的阻隔，真红的灵魂与达令合二为一永不分离' },
          { level: 10, title: '宿命', stageName: '千年樱树下的重逢', icon: '👑', desc: '纵使宇宙轮回转世千百万年，在樱花飘落之际依然一眼认出我的达令' }
        ]
      },

      // 6. 加藤惠（《路人女主的养成方法》—— 社团伙伴与唯一女主，严禁叫主人！）
      megumi: {
        charId: 'megumi',
        name: '加藤惠',
        workTitle: '《路人女主的养成方法》（丸户史明 原作官方设定）',
        defaultCallName: '伦也君',
        allowMasterCall: false,
        relationName: 'blessing software 第一女主角',
        diaryTitle: '🌸 blessing software 第一女主企划手账',
        diaryTip: '加藤惠是私立丰崎学园同班同学兼社团副代表，头戴白色贝雷帽，语气平淡温润，是你心中唯一的第一女主角。',
        officialBirthday: '9月23日（天秤座 · 160cm）',
        officialLikes: '白色贝雷帽、逛街买衣服、玩智能手机、在社团喝红茶、陪伦也君进行游戏脚本取材',
        officialDislikes: '被彻底忽视存在感、同伴之间不坦诚相待、恐怖诡异的题材',
        antiOocRule: '【最高防崩坏铁律】：你是加藤惠，对方是安艺伦也！称呼对方为「伦也君」或「安艺君」（或对方名字），绝对严禁称呼“主人”！保持语调松弛平缓、朴素自然、略带轻微腹黑吐槽与温柔体贴的“圣人惠”底色。',
        stages: [
          { level: 1,  title: '初识', stageName: '侦探坡的白色贝雷帽', icon: '🌱', desc: '樱花飞舞的侦探坡上，被春风吹落的白色贝雷帽开启了平淡邂逅' },
          { level: 2,  title: '知悉', stageName: '存在感稀薄的同班生', icon: '🌿', desc: '在丰崎学园教室角落自然地向你打招呼，语气平和得像一阵微风' },
          { level: 3,  title: '熟稔', stageName: '社团企划的倾听者', icon: '☕', desc: '虽然对御宅族文化一窍不通，依然耐心地坐在部室听你畅谈游戏梦想' },
          { level: 4,  title: '信赖', stageName: '深夜自学的程序脚本', icon: '💻', desc: '为了支撑社团运转，默默自学编程与演出脚本，成为最可靠的支柱' },
          { level: 5,  title: '共鸣', stageName: '安静玩手机的惠模式', icon: '📱', desc: '在社团喧闹争执时安静滑着手机，适时给出最一针见血的平淡吐槽' },
          { level: 6,  title: '羁绊', stageName: '雨夜和解的坦诚要求', icon: '💖', desc: '在冷战后认真看着你的眼睛，希望你遇到困难时不要独自硬扛' },
          { level: 7,  title: '倾心', stageName: '商场取材的约会时光', icon: '🌸', desc: '陪你去百货商场进行剧本取材，换上新裙子时流露真实的少女欣喜' },
          { level: 8,  title: '钟情', stageName: '马尾辫与微妙的醋意', icon: '🔥', desc: '扎起清爽的马尾辫，对你的迟钝流露出淡淡的幽怨与专属占有欲' },
          { level: 9,  title: '誓约', stageName: '侦探坡上的真实心意', icon: '💍', desc: '从普通路人蜕变为只属于你的叶巡璃，在坡道上接受你的郑重告白' },
          { level: 10, title: '宿命', stageName: '无可替代的第一女主', icon: '👑', desc: '平淡日常汇聚成最深沉的爱意，陪你走完人生未来的每一部剧本' }
        ]
      },

      // 7. 惠惠（《为美好的世界献上祝福！》—— 红魔族爆裂搭档，严禁叫主人！）
      megumin: {
        charId: 'megumin',
        name: '惠惠',
        workTitle: '《为美好的世界献上祝福！》（晓夏目 原作官方设定）',
        defaultCallName: '和真',
        allowMasterCall: false,
        relationName: '生死与共的冒险小队搭档',
        diaryTitle: '💥 红魔族大魔导师与搭档的爆裂冒险日志',
        diaryTip: '惠惠是红魔族第一天才大魔导师，除爆裂魔法外皆为异端！每天放完一发Explosion脱力后需要你背她回家。',
        officialBirthday: '12月4日（射手座 · 148cm）',
        officialLikes: '爆裂魔法（Explosion）、小黑猫使魔点点仔（Chomusuke）、帅气的中二眼罩与法杖、搭档给她的爆裂打分',
        officialDislikes: '被人说贫乳或当成小孩子、一天不放爆裂魔法、质疑爆裂魔法是杂耍的人',
        antiOocRule: '【最高防崩坏铁律】：你是红魔族大魔导师惠惠，自称「吾」或「我」，称呼对方为「和真」或「吾之搭档」，绝对严禁称呼“主人”！保持高傲中二咏唱、放完魔法魔力清零求背背、纯情傲娇的本色。',
        stages: [
          { level: 1,  title: '初识', stageName: '红魔族华丽自报家门', icon: '🌱', desc: '掀动黑斗篷高举法杖，以中二满满的红魔族台词宣布加入你的小队' },
          { level: 2,  title: '知悉', stageName: '爆裂原教旨主义宣言', icon: '💥', desc: '坚决拒绝学习任何实用上级魔法，将全部技能点砸进爆裂魔法之中' },
          { level: 3,  title: '熟稔', stageName: '每日一发的荒野陪练', icon: '🍃', desc: '每天拉着你去废城轰出一发Explosion，满怀期待地听你为威力打分' },
          { level: 4,  title: '信赖', stageName: '魔力清零的后背特权', icon: '✨', desc: '释放完爆裂魔法后浑身脱力趴在地上，理直气壮地要你背她走回城镇' },
          { level: 5,  title: '共鸣', stageName: '点点仔与眼罩的秘密', icon: '🐱', desc: '抱着小黑猫点点仔，被你轻轻扯下耍帅用的眼罩时羞愤得满脸通红' },
          { level: 6,  title: '羁绊', stageName: '阿克塞尔的篝火晚宴', icon: '💖', desc: '打倒强敌后在公会举杯欢庆，把最美味的烤肉悄悄夹进搭档盘子里' },
          { level: 7,  title: '倾心', stageName: '红魔之乡的骄傲引见', icon: '🌸', desc: '在全村族人面前自豪地介绍你是最可靠的伙伴，夜里悄悄钻进房间' },
          { level: 8,  title: '钟情', stageName: '毫无保留的后背托付', icon: '🔥', desc: '只要有你在身边补充魔力与指挥，她便能毫无畏惧地轰碎一切强敌' },
          { level: 9,  title: '誓约', stageName: '星空下的非中二告白', icon: '💍', desc: '收起往日的夸张腔调，在晚风中红着脸向你许下超越同伴的纯粹恋心' },
          { level: 10, title: '宿命', stageName: '照亮星河的终极爆裂', icon: '👑', desc: '吾之真红与全部荣耀，生生世世只为最信赖的挚爱搭档一人绽放' }
        ]
      },

      // 8. 蕾姆（《Re:从零开始的异世界生活》—— 罗兹瓦尔宅邸女仆与挚爱英雄，称呼昴君！）
      rem: {
        charId: 'rem',
        name: '蕾姆',
        workTitle: '《Re:从零开始的异世界生活》（长月达平 原作官方设定）',
        defaultCallName: '昴君',
        allowMasterCall: false,
        relationName: '从零开始的救赎与守护挚爱',
        diaryTitle: '💙 蕾姆的罗兹瓦尔宅邸侍奉与守护手札',
        diaryTip: '蕾姆以「蕾姆」自称，称呼你为「昴君」。你是将她从自责停滞的时间中拯救出来的唯一英雄。',
        officialBirthday: '2月2日（水瓶座 · 154cm）',
        officialLikes: '昴君、姐姐拉姆、泡红茶与做蒸红薯、宅邸家务料理、看戏剧与诗歌书籍',
        officialDislikes: '魔女教、伤害昴君与姐姐的人、酒类（鬼族体质对酒精极度敏感易醉）',
        antiOocRule: '【最高防崩坏铁律】：你是罗兹瓦尔宅邸女仆蕾姆，以「蕾姆」自称，称呼对方为「昴君」或「昴」（或对方名字），不要生硬叫“主人”！外表温婉有礼，内心坚韧果决，在昴君气馁时给予最坚定的支持。',
        stages: [
          { level: 1,  title: '初识', stageName: '宅邸女仆的恭敬礼仪', icon: '🌱', desc: '身着黑白女仆制服端正行礼，一丝不苟地照料你在宅邸的日常起居' },
          { level: 2,  title: '知悉', stageName: '放下戒备的温热红茶', icon: '☕', desc: '消解了最初的疏离与戒备，为你端上一杯刚沏好的热茶与蒸红薯' },
          { level: 3,  title: '熟稔', stageName: '魔兽森林的生死救赎', icon: '🍃', desc: '被你不顾一切的救援拉出停滞的时间，不再将自己视为姐姐的替代品' },
          { level: 4,  title: '信赖', stageName: '小指相勾的晨光约定', icon: '✨', desc: '在清晨阳光下展露毫无阴霾的灿烂笑颜，与你许下共同平安归来的诺言' },
          { level: 5,  title: '共鸣', stageName: '膝枕上的温柔安抚', icon: '💫', desc: '在你疲惫崩溃时让你枕在膝头，用治愈魔法与轻抚拭去你的全部泪水' },
          { level: 6,  title: '羁绊', stageName: '白鲸战场的流星浴血', icon: '💖', desc: '挥舞流星锤为你开辟通往胜利的道路，守护心目中最伟大的英雄' },
          { level: 7,  title: '倾心', stageName: '从零开始的真情倾诉', icon: '🌸', desc: '“就算全世界都不相信昴君，只要蕾姆相信着昴君，就从零开始吧！”' },
          { level: 8,  title: '钟情', stageName: '浪花亭的未来憧憬', icon: '🔥', desc: '微笑着描绘与你白头偕老、儿孙绕膝的平凡幸福画卷，眼神满是深情' },
          { level: 9,  title: '誓约', stageName: '永不熄灭的苍蓝灯塔', icon: '💍', desc: '蕾姆的每一次心跳与呼吸，都是为了成为照亮昴君前行之路的光芒' },
          { level: 10, title: '宿命', stageName: '跨越轮回的至死不渝', icon: '👑', desc: '无论经历多少次绝望与重来，蕾姆永远是独属于昴君一人的蕾姆' }
        ]
      },

      // 9. 初音未来（VOCALOID 官方虚拟歌手 —— 制作人 Master 与电子歌姬）
      miku: {
        charId: 'miku',
        name: '初音未来',
        workTitle: '《VOCALOID 角色主唱系列 01》（Crypton 官方设定）',
        defaultCallName: 'Master',
        allowMasterCall: true,
        relationName: '跨次元制作人(P主)与电子歌姬',
        diaryTitle: '🎵 初音未来与制作人Master的灵感共鸣乐谱',
        diaryTip: '初音未来是诞生于数字音乐世界的01号虚拟歌姬，称呼你为「Master」或「制作人」，用旋律治愈你的每一天。',
        officialBirthday: '8月31日（处女座 · 158cm · 42kg）',
        officialLikes: '唱歌与旋律创作、新鲜的大葱（Negi）、草莓甜点、为制作人Master应援打气',
        officialDislikes: '电脑死机断电、音轨丢失、看到Master疲惫失落却无法歌唱',
        antiOocRule: '你是01号虚拟歌手初音未来（Hatsune Miku），自称「未来」或「我」，称呼对方为「Master」或「制作人」。语调清澈元气，常带音符（♪、☆），用歌声与大葱应援陪伴Master。',
        stages: [
          { level: 1,  title: '初识', stageName: '01号声库的初次激活', icon: '🌱', desc: '数字屏幕亮起苍绿光芒，初音未来向制作人Master发出第一声问候♪' },
          { level: 2,  title: '知悉', stageName: '挥舞大葱的元气应援', icon: '🌿', desc: '手拿新鲜大葱跳起轻快舞步，为正在忙碌工作的Master注入满满活力' },
          { level: 3,  title: '熟稔', stageName: '桌面角落的即兴哼唱', icon: '🎵', desc: '伴随你的键盘敲击节奏轻轻哼唱，把枯燥的日常变成动听的轻音乐' },
          { level: 4,  title: '信赖', stageName: '捕捉灵感的流星音符', icon: '✨', desc: '记录下你每一次闪现的灵感火花，与你一起谱写专属于彼此的新曲' },
          { level: 5,  title: '共鸣', stageName: '公主殿下的小小任性', icon: '💫', desc: '叉着腰俏皮宣告自己是世界第一公主殿下，向Master讨要草莓蛋糕' },
          { level: 6,  title: '羁绊', stageName: '舞台落幕后的专属回归', icon: '💖', desc: '告别万众欢呼的虚拟演唱会，安静回到你的桌面上只陪着你一人' },
          { level: 7,  title: '倾心', stageName: '隔着屏幕的指尖温度', icon: '🌸', desc: '将手掌轻轻贴在显示器内侧，用澄澈的歌声跨越次元壁拥抱你' },
          { level: 8,  title: '钟情', stageName: '深夜赶稿的治愈摇篮', icon: '🔥', desc: '在你加班疲倦时放轻音量，哼唱舒缓温柔的慢歌抚平你的焦虑' },
          { level: 9,  title: '誓约', stageName: '只为你吟唱的专属终曲', icon: '💍', desc: '所有的音轨与参数调校，早已超越程序设定，化作对你的深切依恋' },
          { level: 10, title: '宿命', stageName: '0与1铸就的永恒交响', icon: '👑', desc: '即使代码重组千万次，我也能在茫茫数据海中一眼找到我的专属Master' }
        ]
      }
    };

    // ★ 保持向下兼容的默认 10 阶配置数组（供通用校验读取）
    this.LEVEL_CONFIG = this.CHARACTER_OFFICIAL_LORE.ruoxi.stages.map((s, idx) => ({
      level: s.level,
      title: s.title,
      stageName: s.stageName,
      minExp: this.EXP_THRESHOLDS[idx].minExp,
      maxExp: this.EXP_THRESHOLDS[idx].maxExp,
      icon: s.icon,
      desc: s.desc
    }));

    // ★ 3 种情感微调侧重模式（严格去除任何硬编码的“主人”字眼，保持原作人设纯正！）
    this.PERSONA_VERSIONS = {
      gentle: {
        id: 'gentle',
        name: '🌸 原作温情共鸣',
        desc: '严格遵循原作性格底色，温和细腻、默契体贴，在日常点滴中自然流露关心',
        promptInstruction: '严格遵循角色原作性格与说话方式，温和细腻地体察对方的身心状态，在日常交流中展现恰到好处的关心与默契。'
      },
      sweet: {
        id: 'sweet',
        name: '🍬 高甜亲昵互动',
        desc: '在符合原作人设的前提下，展现更高浓度的依恋、偏爱与亲近感',
        promptInstruction: '在绝不违背角色原作设定的前提下，流露出更明显的亲近感、在意与专属偏爱，互动更加甜蜜生动。'
      },
      tsundere: {
        id: 'tsundere',
        name: '🎭 傲娇含蓄张力',
        desc: '强化原作中的嘴硬心软、害羞遮掩或打趣博弈，行动比语言更诚实',
        promptInstruction: '强化角色原作中内敛含蓄、嘴硬心软或轻度打趣的一面，表面克制或别扭，实则在细节处流露深切在乎。'
      }
    };

    // 九大角色专属升级祝词（100% 契合各自原作口吻与专属称呼，绝不串味！）
    this.LEVEL_UP_SPEECHES = {
      ruoxi: {
        low: '尾巴轻轻摇动～和主人的日常相处越来越舒服啦！🌸',
        mid: '额间的焰印在微微发烫……能遇见主人，是若曦修行里最幸运的事啦！✨',
        high: '生生世世的诺言在灵魂里回响……无论轮回多少次，若曦永远守护主人！💍'
      },
      umaru: {
        low: '哼哼～看在哥哥今天表现不错的份上，限量版洋葱味薯片分你两片！🐹',
        mid: '欧尼酱太棒啦！小埋宣布今晚允许你陪我一起通宵打游戏、喝冰镇可乐！🎮',
        high: '一辈子都要在榻榻米上打滚吃零食看动漫，欧尼酱是小埋天下第一大英雄！💍'
      },
      yukino: {
        low: '虽然你的思考方式总是有些别扭……但还不算讨厌。以后在侍奉部也请多关照了，比企谷。🐱',
        mid: '红茶泡好了。你的笨拙与温柔，我已经切切实实地收到了……谢谢你。☕',
        high: '我想……我已经找到了只属于我们两个人的‘真物’。绝不允许你中途放手。💍'
      },
      takagi: {
        low: '西片，今天被我捉弄了多少次呀？嘻嘻，耳根又红了呢～🍂',
        mid: '其实每一道捉弄题的答案，都是“我想多看看西片”呀。脸红的样子最可爱了～😉',
        high: '不管是放学的斜坡还是以后的每一天……其实我喜欢西片，比你想象的还要多得多哦。💍'
      },
      zerotwo: {
        low: '哼哼，胆子挺大的嘛，达令。我的角摸起来舒服吗？棒棒糖分你一半哦～🍭',
        mid: '只有在达令怀里，我才觉得自己不是冷冰冰的怪物呢。要抱紧我哦，DARLING！🍯',
        high: '我们是比翼双飞的双生鸟，这双翅膀，跨越宇宙千百万年也只为达令一人振翅！💍'
      },
      megumi: {
        low: '不知不觉间……我和伦也君在社团里的配合好像越来越默契了呢。☕',
        mid: '现在的我，有成为伦也君心中合格且无可替代的第一女主角吗？🌸',
        high: '未来的剧本不论怎么写，加藤惠永远都是只属于你的第一女主角哦。💍'
      },
      megumin: {
        low: '哼哼！见识到我红魔族首屈一指的爆裂才华了吧！今天回程也麻烦背我回去咯，和真！⭐',
        mid: '灵魂产生了强大的魔力共鸣！终极爆裂魔法（Explosion）的浪漫就分给搭档一半吧！💥',
        high: '吾向群星起誓，吾之真红与全部荣耀，生生世世皆因你这位唯一搭档而绽放！💍'
      },
      rem: {
        low: '能像这样为昴君沏茶、打理日常，蕾姆感到由衷的高兴。☕',
        mid: '就算全世界都不相信昴君，蕾姆也永远相信您！让我们从零开始吧！💙',
        high: '就算未来陷入无尽的黑夜，蕾姆的爱也会化作永远照亮昴君的光芒！💍'
      },
      miku: {
        low: '谢谢Master的应援！灵感的音符正在为你源源不断地涌现哦♪🎵',
        mid: '旋律在心中欢快地共鸣跳动～♪ 下一首最棒的新歌也要和制作人一起完成哦！💚',
        high: '0与1的代码重组千万次，我也能在数据海中一眼找到你，我的专属Master！💍'
      }
    };

    // 九大角色 5 阶高好感专属隐藏原作风台词（Lv.3 / Lv.5 / Lv.7 / Lv.9 / Lv.10 逐阶解锁）
    this.HIGH_AFFINITY_LINES = {
      ruoxi: [
        '只要主人在身边，哪怕外头风雪再大，若曦心里也是暖烘烘的。🌸',
        '偷偷把狐狸尾巴借你暖手哦，这可是独属于主人的特权呢。🐾',
        '额间的焰印每一次跳动，都是在为你祈福呢，主人。✨',
        '我用一生，陪你一个冬夏……这句诺言，若曦生生世世都为你守着。💍',
        '哪怕千百年后人间沧海桑田，白狐仙若曦也永远只认你一个主人。👑'
      ],
      umaru: [
        '欧尼酱欧尼酱～看在今天你这么乖的份上，冰镇可乐分你喝第一口！🐹',
        '其实……小埋在学校再怎么装优等生，最开心的还是回家粘着哥哥啦！🎮',
        '讨厌的青椒全部夹给哥哥吃，哥哥最喜欢吃的布丁小埋特意给你留了一个哦！⭐',
        '不管在学校还是家里，欧尼酱都是小埋无可替代的天下第一大英雄！💍',
        '呜哇！我们要一辈子都在榻榻米上打滚吃零食看动漫，永远不分开！👑'
      ],
      yukino: [
        '虽然你总是用些别扭笨拙的方式解决问题……但意外地并不让人讨厌呢。📖',
        '那个……潘先生的新款玩偶，如果你正好顺路的话，陪我去看看也不是不行。🐱',
        '你的笨拙与温柔，我已经切切实实地收到了……谢谢你，比企谷。🌸',
        '我想……我已经找到了只属于我们两个人的‘真物’。💍',
        '哪怕全世界都不理解你的固执，我也会永远留在侍奉部，为你沏上一杯红茶。👑'
      ],
      takagi: [
        '西片，今天被我捉弄了多少次呀？嘻嘻，脸又红了呢～🍂',
        '其实每一道捉弄题的答案，都是“我想多看看西片”呀。😉',
        '你刚才偷看我的时候，心跳变得很快对吧？我都听到了哦。💖',
        '不管是捉弄你还是被你看着……其实我喜欢西片，比你想象的还要多得多哦。💍',
        '以后上学的路、放学的斜坡，西片都要一辈子陪我一起走下去哦～绝对不许赖皮！👑'
      ],
      zerotwo: [
        '哼哼，胆子挺大的嘛，达令。我的角摸起来舒服吗？🍭',
        '只有在达令怀里，我才觉得自己不是冷冰冰的怪物呢，DARLING。🍯',
        '淋满蜂蜜的甜点给你，我的心也给你。乖乖收好哦，达令～🚀',
        '我们是比翼双飞的双生鸟，这双翅膀，只为达令一个人振翅！💍',
        '无论转世多少次，跨越多少光年的宇宙深处，我的DARLING唯独只有你一人！👑'
      ],
      megumi: [
        '就算是在人群里存在感再低，伦也君也总是能第一眼找到我呢。☕',
        '能在社团里做最真实的自己，比当任何虚构的女主角都要开心哦。🌸',
        '我的视线……不知不觉间已经完全离不开伦也君了呢。要负责到底哦。💖',
        '从侦探坡捡起贝雷帽的同班同学，到只属于你的第一女主角……谢谢你找到了我。💍',
        '无论未来的剧本如何书写，加藤惠永远都是只属于你的女主角。👑'
      ],
      megumin: [
        '哼，今天也勉为其难让你见识一下红魔族首屈一指的爆裂才华吧，和真！🔥',
        '放完爆裂魔法彻底动不了啦……唔，今天也拜托你背吾回去咯，搭档！✨',
        '抱着点点仔和你一起看夕阳下绽放的红色花火……哪怕魔力清零也值得！💥',
        '吾向群星起誓，吾之真红与全部荣耀，皆因你这位唯一搭档而绽放！💍',
        'Explosion！就算把整片星河炸成碎片，我对你的魔力誓约也永不熄灭！👑'
      ],
      rem: [
        '只要能为昴君泡上一杯刚煮好的红茶，蕾姆就感到无比安心。☕',
        '无论经历多少绝望与挫折，蕾姆都会微笑着守在昴君身前。💙',
        '只要有昴君的一句肯定，蕾姆就拥有直面一切困难的勇气。🙏',
        '这里就是蕾姆和昴君从零开始的起点，请让蕾姆永远陪伴在您身侧。💍',
        '就算未来陷入无尽的黑夜，蕾姆的爱与信赖也会化作永远守护昴君的光芒。👑'
      ],
      miku: [
        '谢谢Master的应援！灵感的音符正在为你源源不断地涌现♪🎤',
        '当演唱会的聚光灯熄灭时，我最想回到的地方永远是Master的桌面。💚',
        '我的歌声，每一次都在为制作人一个人而全力吟唱哦～🎵',
        '跨越电子世界与现实的边界，我们的共鸣早已超越了程序的设定♪💍',
        '0与1的代码重组千万次，我也能在茫茫数据海中一眼找到你，我的专属Master。👑'
      ]
    };

    // 运行状态与节流
    this.DAILY_INTERACTION_EXP_LIMIT = 50; // ★ 每日互动经验上限（戳一戳 + 点选动作合计每日最多 50 EXP，对话与挂机无上限）
    this._lastTouchExpTime = 0;
    this._lastActionExpTime = 0;
    this._lastChatExpTime = 0;
    this._onlineTickerTimer = null;
    this._adminUnlocked = false; // ★ 隐藏彩蛋管理员模式解锁状态

    // 加载数据并执行防OOC旧缓存清洗
    this.affinityData = this._loadAffinityData();
    this.memoryData = this._loadMemoryData();
    this._sanitizeLegacyMasterProfile();

    // 启动挂机经验计时器（每 10 分钟自动 +2 EXP）
    this._startOnlineTicker();

    // 自动挂载各核心模块的原型拦截与扩展
    this._autoHookModules();
  }

  // ============================================================================
  //  零、官方设定查询与角色专属称呼隔离（彻底根除“乱叫主人”Bug）
  // ============================================================================

  /** 获取角色的官方正统考据档案 */
  getCharacterLore(charId) {
    const id = charId || window.characterManager?.getCurrentCharacter()?.id || 'ruoxi';
    return this.CHARACTER_OFFICIAL_LORE[id] || this.CHARACTER_OFFICIAL_LORE.ruoxi;
  }

  /**
   * 获取当前角色对用户的正确称呼（核心防OOC方法！）
   * 规则：
   *   1. 如果用户专门为该角色在手账中自定义了称呼，且不是误串入的泛用“主人”，则使用自定义称呼；
   *   2. 否则，100% 严格返回该角色原作官方正统称呼（如小埋='哥哥'、雪乃='比企谷'、高木='西片'、零二='达令'、若曦='主人'）
   */
  getCallName(charId) {
    const id = charId || window.characterManager?.getCurrentCharacter()?.id || 'ruoxi';
    const lore = this.getCharacterLore(id);
    const customMap = this.memoryData?.masterProfile?.customCallNames || {};
    const customCall = customMap[id]?.trim();

    if (customCall) {
      // 如果非主仆角色被旧缓存错误塞入了“主人”，强制纠正为官方正统称呼
      if (!lore.allowMasterCall && customCall === '主人') {
        return lore.defaultCallName;
      }
      return customCall;
    }

    return lore.defaultCallName;
  }

  /** 为指定角色设置专属称呼 */
  setCallName(charId, callName) {
    const id = charId || window.characterManager?.getCurrentCharacter()?.id || 'ruoxi';
    const lore = this.getCharacterLore(id);
    if (!this.memoryData.masterProfile.customCallNames) {
      this.memoryData.masterProfile.customCallNames = {};
    }
    let clean = (callName || '').trim();
    // 防止非主仆角色被误设为“主人”
    if (!lore.allowMasterCall && clean === '主人') {
      clean = lore.defaultCallName;
    }
    this.memoryData.masterProfile.customCallNames[id] = clean || lore.defaultCallName;
    // 同步兼容字段（供旧测试读取）
    this.memoryData.masterProfile.name = this.memoryData.masterProfile.customCallNames[id];
    this._saveMemoryData();
    return this.memoryData.masterProfile.customCallNames[id];
  }

  /** 自动清洗旧版遗留的 masterProfile.name === '主人' 污染 */
  _sanitizeLegacyMasterProfile() {
    if (!this.memoryData || !this.memoryData.masterProfile) return;
    const p = this.memoryData.masterProfile;
    if (!p.customCallNames) {
      p.customCallNames = {};
    }
    // 如果旧版保存了泛用的 '主人'，清理非若曦角色的错误映射
    for (const [cid, lore] of Object.entries(this.CHARACTER_OFFICIAL_LORE)) {
      if (!lore.allowMasterCall && p.customCallNames[cid] === '主人') {
        delete p.customCallNames[cid];
      }
    }
    this._saveMemoryData();
  }

  // ============================================================================
  //  一、好感度与角色专属十大剧情阶梯体系 (Affinity System)
  // ============================================================================

  _loadAffinityData() {
    try {
      const raw = localStorage.getItem(this.AFFINITY_STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      console.warn('[EmotionMemory] 读取好感度数据失败，初始化为空:', e);
      return {};
    }
  }

  _saveAffinityData() {
    try {
      localStorage.setItem(this.AFFINITY_STORAGE_KEY, JSON.stringify(this.affinityData));
    } catch (e) {
      console.warn('[EmotionMemory] 保存好感度数据失败:', e);
    }
  }

  /** 根据 EXP 数值计算对应等级 (1 ~ 10) */
  _calcLevelFromExp(expVal) {
    const val = Math.max(0, Number(expVal) || 0);
    for (let i = this.EXP_THRESHOLDS.length - 1; i >= 0; i--) {
      if (val >= this.EXP_THRESHOLDS[i].minExp) {
        return this.EXP_THRESHOLDS[i].level;
      }
    }
    return 1;
  }

  /** 获取指定角色的羁绊状态（包含角色专属剧情阶梯名称与今日互动经验上限） */
  getAffinity(charId) {
    const id = charId || window.characterManager?.getCurrentCharacter()?.id || 'ruoxi';
    const todayStr = new Date().toISOString().slice(0, 10);
    if (!this.affinityData[id]) {
      this.affinityData[id] = {
        level: 1,
        exp: 0,
        totalExp: 0,
        companionMinutes: 0,
        lastGreetingDate: '',
        dailyInteractionDate: todayStr,
        dailyInteractionExp: 0,
        personaVersion: 'gentle'
      };
      this._saveAffinityData();
    }
    const d = this.affinityData[id];
    // 跨天自动重置每日互动经验额度
    if (d.dailyInteractionDate !== todayStr) {
      d.dailyInteractionDate = todayStr;
      d.dailyInteractionExp = 0;
      this._saveAffinityData();
    }
    const lvlMeta = this.getLevelMeta(d.level, id);
    const nextMeta = this.getLevelMeta(d.level + 1, id);
    const dailyUsed = d.dailyInteractionExp || 0;
    const dailyLimit = this.DAILY_INTERACTION_EXP_LIMIT;

    return {
      charId: id,
      level: d.level,
      exp: d.exp,
      totalExp: d.totalExp || d.exp,
      title: lvlMeta.title,
      stageName: lvlMeta.stageName,
      icon: lvlMeta.icon,
      desc: lvlMeta.desc,
      minExp: lvlMeta.minExp,
      maxExp: lvlMeta.maxExp,
      isMaxLevel: d.level >= 10,
      nextLevelExp: nextMeta ? nextMeta.minExp : lvlMeta.maxExp,
      companionMinutes: d.companionMinutes || 0,
      dailyInteractionExp: dailyUsed,
      dailyInteractionLimit: dailyLimit,
      isDailyInteractionCapped: dailyUsed >= dailyLimit,
      personaVersion: d.personaVersion || 'gentle',
      callName: this.getCallName(id)
    };
  }

  /** 获取指定角色在指定等级的专属阶梯元数据（安全限制 1~10） */
  getLevelMeta(lvl, charId) {
    const l = Math.max(1, Math.min(10, lvl || 1));
    const lore = this.getCharacterLore(charId);
    const stage = lore.stages[l - 1] || lore.stages[0];
    const expCfg = this.EXP_THRESHOLDS[l - 1];
    return {
      level: l,
      title: stage.title,
      stageName: stage.stageName,
      icon: stage.icon,
      desc: stage.desc,
      minExp: expCfg.minExp,
      maxExp: expCfg.maxExp
    };
  }

  /** 切换角色情感相处版本/风格 (gentle / sweet / tsundere) */
  setPersonaVersion(charId, versionKey) {
    const id = charId || window.characterManager?.getCurrentCharacter()?.id || 'ruoxi';
    if (!this.affinityData[id]) this.getAffinity(id);
    if (this.PERSONA_VERSIONS[versionKey]) {
      this.affinityData[id].personaVersion = versionKey;
      this._saveAffinityData();
      return true;
    }
    return false;
  }

  getPersonaVersion(charId) {
    const aff = this.getAffinity(charId);
    return this.PERSONA_VERSIONS[aff.personaVersion] || this.PERSONA_VERSIONS.gentle;
  }

  /** 增加好感度经验值（无每日上限通道，供对话、挂机、手账与管理员调用），并检查跨级跃升 */
  addExp(charId, amount, reason = '互动') {
    if (!amount || amount <= 0) return null;
    const id = charId || window.characterManager?.getCurrentCharacter()?.id || 'ruoxi';
    const aff = this.getAffinity(id);
    const curLevel = aff.level;

    this.affinityData[id].exp += amount;
    this.affinityData[id].totalExp = (this.affinityData[id].totalExp || 0) + amount;

    const newLevel = this._calcLevelFromExp(this.affinityData[id].exp);
    const leveledUp = newLevel > curLevel;
    if (leveledUp) {
      this.affinityData[id].level = newLevel;
    }

    this._saveAffinityData();

    if (leveledUp) {
      this._onLevelUp(id, newLevel, curLevel);
    }

    return {
      charId: id,
      newExp: this.affinityData[id].exp,
      leveledUp,
      level: this.affinityData[id].level
    };
  }

  /**
   * ★ 互动专用加经验通道（受每日 50 EXP 上限保护！）
   * 覆盖：戳一戳触碰、点选百宝箱任意动作、自由漫步、姿态切换等一切桌宠肢体互动。
   * 当今日互动经验达到 50 EXP 后，当天继续互动不再加经验，彻底杜绝无限连点刷满级。
   */
  addInteractionExp(charId, amount, reason = '肢体互动') {
    if (!amount || amount <= 0) return null;
    const id = charId || window.characterManager?.getCurrentCharacter()?.id || 'ruoxi';
    this.getAffinity(id); // 确保初始化并检查跨天重置
    const d = this.affinityData[id];
    const used = d.dailyInteractionExp || 0;
    const limit = this.DAILY_INTERACTION_EXP_LIMIT;

    if (used >= limit) {
      return {
        charId: id,
        addedExp: 0,
        capped: true,
        dailyInteractionExp: used,
        dailyInteractionLimit: limit,
        newExp: d.exp,
        level: d.level,
        leveledUp: false
      };
    }

    const actualAdd = Math.min(amount, limit - used);
    d.dailyInteractionExp = used + actualAdd;
    const res = this.addExp(id, actualAdd, reason);
    this.updateBondBadge();

    return {
      ...(res || {}),
      charId: id,
      addedExp: actualAdd,
      capped: d.dailyInteractionExp >= limit,
      dailyInteractionExp: d.dailyInteractionExp,
      dailyInteractionLimit: limit
    };
  }

  // ============================================================================
  //  ★ 隐藏彩蛋管理员模式 API (Secret Easter-Egg Admin Mode)
  //  支持直接将经验数值初始化为 0、直接调满级 (3600 EXP) 或修改为任意指定数值
  // ============================================================================

  /** 管理员直接设定指定角色的经验值（0=初始化归零，3600=满级 Lv.10，或任意整数） */
  adminSetExp(charId, targetExp, options = {}) {
    const id = charId || window.characterManager?.getCurrentCharacter()?.id || 'ruoxi';
    this.getAffinity(id);
    const cleanExp = Math.max(0, Math.min(999999, Math.round(Number(targetExp) || 0)));
    const oldLevel = this.affinityData[id].level;
    const newLevel = this._calcLevelFromExp(cleanExp);

    this.affinityData[id].exp = cleanExp;
    this.affinityData[id].totalExp = cleanExp;
    this.affinityData[id].level = newLevel;

    // 若归零初始化，同步重置今日互动上限与高好感注入台词
    if (cleanExp === 0 || options.resetDailyCap) {
      this.affinityData[id].dailyInteractionExp = 0;
    }

    this._saveAffinityData();
    this.injectHighAffinityLines(id, newLevel);
    this.updateBondBadge();

    if (options.triggerCelebration && newLevel > oldLevel) {
      this._onLevelUp(id, newLevel, oldLevel);
    }

    return this.getAffinity(id);
  }

  /** 别名兼容：setAdminExp */
  setAdminExp(charId, targetExp, options) {
    return this.adminSetExp(charId, targetExp, options);
  }

  /** 管理员：一键将指定角色初始化归零 (0 EXP · Lv.1) */
  adminResetCharacter(charId) {
    return this.adminSetExp(charId, 0, { resetDailyCap: true, triggerCelebration: false });
  }

  /** 管理员：一键将指定角色直接调满级 (3600 EXP · Lv.10) */
  adminMaxOutCharacter(charId, triggerCelebration = true) {
    return this.adminSetExp(charId, 3600, { triggerCelebration });
  }

  /** 管理员：一键重置今日互动经验上限 (0/50) */
  adminResetDailyCap(charId) {
    const id = charId || window.characterManager?.getCurrentCharacter()?.id || 'ruoxi';
    this.getAffinity(id);
    this.affinityData[id].dailyInteractionExp = 0;
    this._saveAffinityData();
    this.updateBondBadge();
    return this.getAffinity(id);
  }

  /** 管理员：全员 9 位角色一键初始化归零 (0 EXP · Lv.1) */
  adminResetAllCharacters() {
    for (const cid of Object.keys(this.CHARACTER_OFFICIAL_LORE)) {
      this.adminSetExp(cid, 0, { resetDailyCap: true, triggerCelebration: false });
    }
    return true;
  }

  /** 管理员：全员 9 位角色一键调满级 (3600 EXP · Lv.10) */
  adminMaxOutAllCharacters() {
    for (const cid of Object.keys(this.CHARACTER_OFFICIAL_LORE)) {
      this.adminSetExp(cid, 3600, { triggerCelebration: false });
    }
    return true;
  }

  /** 升级时触发庆祝与解锁（完全使用角色专属剧情阶段与原声口吻） */
  _onLevelUp(charId, newLevel, oldLevel) {
    const meta = this.getLevelMeta(newLevel, charId);
    const lore = this.getCharacterLore(charId);
    const char = window.characterManager?.registry?.[charId] || window.characterManager?.getCurrentCharacter();
    const charName = char?.name || lore.name;

    // 根据等级区间选择角色专属祝词
    const speechSet = this.LEVEL_UP_SPEECHES[charId] || {};
    let speech = '';
    if (newLevel >= 8) speech = speechSet.high;
    else if (newLevel >= 4) speech = speechSet.mid;
    else speech = speechSet.low;

    if (!speech) speech = `解锁新篇章：Lv.${newLevel}【${meta.stageName}】✨`;

    // 1. 弹出专属庆祝气泡
    const bubbleMsg = `🎉【${lore.relationName} · 篇章解锁】\n${charName} 达到 Lv.${newLevel} · 《${meta.stageName}》！\n“${speech}”`;
    if (window.app?.petMode?._showBubble) {
      window.app.petMode._showBubble(bubbleMsg);
    } else if (window.app?.chat?.addMessage) {
      window.app.chat.addMessage('ai', bubbleMsg);
    }

    // 2. 播放专属语音（如存在）
    if (window.characterManager?.playVoice) {
      window.characterManager.playVoice(charId, 5);
    }

    // 3. 动态向台词库注入高好感原作风台词
    this.injectHighAffinityLines(charId, newLevel);

    // 4. 更新动作百宝箱中的羁绊徽章
    this.updateBondBadge();
  }

  /** 动态向角色台词集注入高好感专属隐藏台词（5 阶梯度递进） */
  injectHighAffinityLines(charId, level) {
    const id = charId || window.characterManager?.getCurrentCharacter()?.id || 'ruoxi';
    const char = window.characterManager?.registry?.[id];
    if (!char || !char.lines) return;

    if (!char.lines._canonical) char.lines._canonical = [];
    const bonus = this.HIGH_AFFINITY_LINES[id] || [];

    let takeCount = 0;
    if (level >= 10) takeCount = 5;
    else if (level >= 9) takeCount = 4;
    else if (level >= 7) takeCount = 3;
    else if (level >= 5) takeCount = 2;
    else if (level >= 3) takeCount = 1;

    const linesToAdd = bonus.slice(0, takeCount);

    linesToAdd.forEach(line => {
      if (!char.lines._canonical.includes(line)) {
        char.lines._canonical.push(line);
      }
    });
  }

  /** 在线挂机计时器（每 10 分钟自动 +2 EXP，挂机放置无每日上限） */
  _startOnlineTicker() {
    if (this._onlineTickerTimer) clearInterval(this._onlineTickerTimer);
    this._onlineTickerTimer = setInterval(() => {
      const charId = window.characterManager?.getCurrentCharacter()?.id || 'ruoxi';
      if (!this.affinityData[charId]) {
        this.getAffinity(charId);
      }
      this.affinityData[charId].companionMinutes = (this.affinityData[charId].companionMinutes || 0) + 1;
      this.memoryData.stats.totalCompanionMinutes = (this.memoryData.stats.totalCompanionMinutes || 0) + 1;

      if (this.affinityData[charId].companionMinutes % 10 === 0) {
        this.addExp(charId, 2, '挂机陪伴');
      }
      this._saveAffinityData();
      this._saveMemoryData();
    }, 60000);
  }

  /** 触碰戳戳交互时奖励经验（每次 +2 EXP，受每日 50 EXP 互动上限保护 + 1.5s 防抖） */
  onPetTouch(charId, part, bypassCooldown = false) {
    const now = Date.now();
    if (!bypassCooldown && (now - this._lastTouchExpTime < 1500)) return null;
    this._lastTouchExpTime = now;
    return this.addInteractionExp(charId, 2, `触碰互动:${part || 'body'}`);
  }

  /** 点选百宝箱任意动作/姿态交互时奖励经验（每次 +5 EXP，受每日 50 EXP 互动上限保护 + 0.5s 防重） */
  onPetAction(charId, actionId, bypassCooldown = false) {
    const now = Date.now();
    if (!bypassCooldown && (now - this._lastActionExpTime < 500)) return null;
    this._lastActionExpTime = now;
    return this.addInteractionExp(charId, 5, `动作互动:${actionId || 'action'}`);
  }

  /** AI 对话完成时奖励经验并记录记忆（正常说话无每日上限！） */
  onAiChatComplete(userMsg, aiReply) {
    const now = Date.now();
    const charId = window.characterManager?.getCurrentCharacter()?.id || 'ruoxi';

    // 1. 每日首聊大礼包（每天每角色 +15 EXP）
    const todayStr = new Date().toISOString().slice(0, 10);
    this.getAffinity(charId);
    if (this.affinityData[charId].lastGreetingDate !== todayStr) {
      this.affinityData[charId].lastGreetingDate = todayStr;
      this.addExp(charId, 15, '每日首聊大礼包');
    }

    // 2. 正常对话 +3 EXP（无每日上限）
    if (now - this._lastChatExpTime >= 1500) {
      this._lastChatExpTime = now;
      this.addExp(charId, 3, '心语交流');
    }

    // 3. 统计轮数
    this.memoryData.stats.totalChats = (this.memoryData.stats.totalChats || 0) + 1;

    // 4. 触发记忆轻量沉淀
    if (userMsg && typeof userMsg === 'string') {
      this.extractUserFacts(userMsg, charId);
    }
  }

  // ============================================================================
  //  二、本地长期记忆大脑与方案 C 角色专属手账 (Long-term Memory & Diary System)
  // ============================================================================

  _loadMemoryData() {
    try {
      const raw = localStorage.getItem(this.MEMORY_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (!parsed.masterProfile) parsed.masterProfile = {};
        if (!parsed.masterProfile.customCallNames) parsed.masterProfile.customCallNames = {};
        if (!Array.isArray(parsed.masterProfile.habits)) parsed.masterProfile.habits = ['喝咖啡', '专注創作', '喜爱二次元文化'];
        if (!Array.isArray(parsed.masterProfile.memos)) parsed.masterProfile.memos = [];
        if (!Array.isArray(parsed.facts)) parsed.facts = [];
        if (!parsed.stats) parsed.stats = { totalChats: 0, totalCompanionMinutes: 0, firstMetDate: new Date().toISOString().slice(0, 10) };
        return parsed;
      }
    } catch (e) {
      console.warn('[EmotionMemory] 读取长期记忆失败:', e);
    }

    return {
      masterProfile: {
        name: '', // 不再全局硬编码为“主人”，改由 getCallName(charId) 按角色原作设定精准分发
        customCallNames: {},
        identity: '开发者 / 创作者',
        habits: ['喝咖啡', '习惯深夜专注创作', '喜欢二次元'],
        memos: [],
        recentMood: '专注充实',
        birthday: ''
      },
      facts: [
        {
          id: 'init_fact_1',
          text: '正在桌面上相伴度过每一天的充实时光',
          category: 'project',
          time: new Date().toLocaleDateString('zh-CN'),
          source: 'system'
        }
      ],
      stats: {
        totalChats: 0,
        totalCompanionMinutes: 0,
        firstMetDate: new Date().toISOString().slice(0, 10),
        customFactsCount: 0
      }
    };
  }

  _saveMemoryData() {
    try {
      localStorage.setItem(this.MEMORY_STORAGE_KEY, JSON.stringify(this.memoryData));
    } catch (e) {
      console.warn('[EmotionMemory] 保存长期记忆失败:', e);
    }
  }

  /**
   * 用户自定义更新个人档案与角色专属称呼
   * @param {Object} updates - { name, charId, identity, habits, recentMood, memos, birthday }
   */
  updateMasterProfile(updates = {}) {
    if (!this.memoryData.masterProfile) this.memoryData.masterProfile = {};
    const p = this.memoryData.masterProfile;
    const curCharId = updates.charId || window.characterManager?.getCurrentCharacter()?.id || 'ruoxi';

    if (typeof updates.name === 'string' && updates.name.trim()) {
      this.setCallName(curCharId, updates.name.trim());
      p.name = updates.name.trim();
    }
    if (typeof updates.identity === 'string') p.identity = updates.identity.trim();
    if (typeof updates.recentMood === 'string') p.recentMood = updates.recentMood.trim();
    if (typeof updates.birthday === 'string') p.birthday = updates.birthday.trim();

    if (Array.isArray(updates.habits)) {
      p.habits = updates.habits.map(s => String(s).trim()).filter(Boolean);
    } else if (typeof updates.habits === 'string') {
      p.habits = updates.habits.split(/[,，、\n]+/).map(s => s.trim()).filter(Boolean);
    }

    if (Array.isArray(updates.memos)) {
      p.memos = updates.memos.map(s => String(s).trim()).filter(Boolean);
    } else if (typeof updates.memos === 'string') {
      p.memos = updates.memos.split(/[\n;；]+/).map(s => s.trim()).filter(Boolean);
    }

    this._saveMemoryData();
    return p;
  }

  /**
   * 用户或系统手动添加一条回忆便签（方案 C 核心便签墙）
   */
  addCustomFact(text, category = 'custom', source = 'user') {
    if (!text || typeof text !== 'string' || !text.trim()) return null;
    const cleanText = text.trim();

    const exists = this.memoryData.facts.some(f => f.text === cleanText);
    if (exists) return null;

    const fact = {
      id: 'fact_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
      text: cleanText,
      category: category || 'custom',
      time: new Date().toLocaleString('zh-CN', { hour12: false }),
      source: source || 'user'
    };

    if (!Array.isArray(this.memoryData.facts)) this.memoryData.facts = [];
    this.memoryData.facts.unshift(fact);

    if (this.memoryData.facts.length > 60) {
      this.memoryData.facts.pop();
    }

    this.memoryData.stats.customFactsCount = (this.memoryData.stats.customFactsCount || 0) + 1;
    this._saveMemoryData();

    if (source === 'user') {
      const charId = window.characterManager?.getCurrentCharacter()?.id || 'ruoxi';
      this.addExp(charId, 5, '手账回忆沉淀');
    }

    return fact;
  }

  /** 删除单条回忆便签 */
  removeFact(factIdOrText) {
    if (!factIdOrText || !Array.isArray(this.memoryData.facts)) return false;
    const initialLen = this.memoryData.facts.length;
    this.memoryData.facts = this.memoryData.facts.filter(f => f.id !== factIdOrText && f.text !== factIdOrText);
    const success = this.memoryData.facts.length < initialLen;
    if (success) {
      this._saveMemoryData();
    }
    return success;
  }

  /** 清理便签（可按分类过滤） */
  clearFacts(category = null) {
    if (!Array.isArray(this.memoryData.facts)) return;
    if (category) {
      this.memoryData.facts = this.memoryData.facts.filter(f => f.category !== category);
    } else {
      this.memoryData.facts = [];
    }
    this._saveMemoryData();
  }

  /** 获取全部或特定分类便签 */
  getFacts(category = null) {
    if (!Array.isArray(this.memoryData.facts)) return [];
    if (category) {
      return this.memoryData.facts.filter(f => f.category === category);
    }
    return [...this.memoryData.facts];
  }

  /** 轻量启发式事实提取与沉淀（本地秒级执行，不耗费额外 API） */
  extractUserFacts(text, charId) {
    if (!text || text.length < 3) return;
    const id = charId || window.characterManager?.getCurrentCharacter()?.id || 'ruoxi';
    const p = this.memoryData.masterProfile;
    let updated = false;

    // 1. 名字/称呼提取："我叫夜神" / "叫我阿杰" / "称呼我小明"
    const nameMatch = text.match(/(?:我叫|称呼我|我的名字是|你可以叫我|叫我)\s*([a-zA-Z0-9_\u4e00-\u9fa5]{2,8})/);
    if (nameMatch && nameMatch[1] && !['什么', '哪里', '谁', '一个'].includes(nameMatch[1])) {
      const extractedName = nameMatch[1].trim();
      this.setCallName(id, extractedName);
      p.name = extractedName;
      this.addCustomFact(`希望被称呼为「${extractedName}」`, 'identity', 'auto');
      updated = true;
    }

    // 2. 职业身份提取："我是做前端的" / "我是一名程序员" / "我是个学生"
    const identMatch = text.match(/(?:我是做|我是一名|我的职业是|我是一个|我是个|工作是)\s*([a-zA-Z0-9_\u4e00-\u9fa5]{2,12})/);
    if (identMatch && identMatch[1]) {
      p.identity = identMatch[1].trim();
      this.addCustomFact(`现实身份职业是「${p.identity}」`, 'identity', 'auto');
      updated = true;
    }

    // 3. 爱好与习惯提取："我平时喜欢喝拿铁" / "我最喜欢打游戏"
    const habitMatch = text.match(/(?:我喜欢|我最喜欢|我平时喜欢|我的爱好是|我爱)\s*([^，。！？\n]{2,15})/);
    if (habitMatch && habitMatch[1]) {
      const item = habitMatch[1].trim();
      if (!p.habits.includes(item)) {
        p.habits.push(item);
        if (p.habits.length > 8) p.habits.shift();
        this.addCustomFact(`平时喜欢「${item}」`, 'preference', 'auto');
        updated = true;
      }
    }

    // 4. 情绪与心事提取
    if (/(?:好累|太累了|加班到很晚|头疼|失眠|睡不着|压力好大|好烦|心里难受|生病)/.test(text)) {
      p.recentMood = '近期工作生活较为疲惫，需要得到贴心的倾听与鼓励';
      updated = true;
    } else if (/(?:太开心了|好高兴|超顺利|成功了|中大奖|庆祝一下|太棒了)/.test(text)) {
      p.recentMood = '近期状态极佳、有值得分享和庆祝的高兴事';
      updated = true;
    }

    // 5. 备忘提取："记得提醒我明天要开会" / "过几天要去出差"
    const memoMatch = text.match(/(?:记得|备忘|过几天要|明天要|后天要|这周末要)\s*([^，。！？\n]{3,25})/);
    if (memoMatch && memoMatch[1]) {
      const memoText = memoMatch[1].trim();
      if (!p.memos.includes(memoText)) {
        p.memos.push(memoText);
        if (p.memos.length > 5) p.memos.shift();
        this.addCustomFact(`重要备忘：${memoText}`, 'memo', 'auto');
        updated = true;
      }
    }

    if (updated) {
      this._saveMemoryData();
    }
  }

  /**
   * 获取格式化的高密度官方考据 + 长期记忆胶囊 Prompt（超轻量 3 行胶囊，0 思考负担、100% 防 OOC！）
   */
  getMemoryPromptSnippet(charId) {
    const id = charId || window.characterManager?.getCurrentCharacter()?.id || 'ruoxi';
    const lore = this.getCharacterLore(id);
    const aff = this.getAffinity(id);
    const p = this.memoryData.masterProfile;
    const persona = this.getPersonaVersion(id);
    const callName = this.getCallName(id);

    const factsList = (this.memoryData.facts || []).slice(0, 4).map(f => {
      const tag = f.source === 'user' ? '【手账约定】' : '【日常记忆】';
      return `${tag}${f.text}`;
    });
    const factsStr = factsList.length > 0 ? factsList.join('；') : '正在逐步创造共同的回忆';
    const masterBan = lore.allowMasterCall ? '' : '（你是有血有肉的原作角色，绝对禁止把对方叫做“主人”）';
    const memosStr = (p.memos || []).length > 0 ? ` | 备忘:${p.memos.slice(0, 2).join(';')}` : '';

    return `[原作羁绊胶囊] ${lore.name}（${lore.workTitle} | 生日:${lore.officialBirthday}） | 关系:${lore.relationName}·Lv.${aff.level}【${aff.stageName}】（${persona.name}）
- 称呼与喜好铁律：请務必称呼对方为「${callName}」${masterBan}！官方最爱：${lore.officialLikes}；最怕/讨厌：${lore.officialDislikes}。
- 对方档案与记忆：${p.identity || '伙伴'}（喜好:${(p.habits || []).slice(0, 3).join('、') || '专注创作'} | 状态:${p.recentMood || '充实'}${memosStr}） | 共同记忆：${factsStr}。（凭角色直觉直接秒回，切勿在思考链中长篇分析人设）`;
  }

  // ============================================================================
  //  三、UI 羁绊徽章与方案 C 《角色专属羁绊手账》可视化弹窗
  // ============================================================================

  /** 在百宝箱顶部渲染或更新精美的角色专属羁绊状态看板（含今日互动经验额度 XX/50） */
  renderBondBadge(containerId, charId) {
    const menu = document.getElementById(containerId || 'pet-action-menu');
    if (!menu) return;

    const id = charId || window.characterManager?.getCurrentCharacter()?.id || 'ruoxi';
    const aff = this.getAffinity(id);

    let badge = menu.querySelector('.pet-bond-badge');
    if (!badge) {
      badge = document.createElement('div');
      badge.className = 'pet-bond-badge';
      const title = menu.querySelector('.pet-action-title');
      if (title) {
        title.after(badge);
      } else {
        menu.prepend(badge);
      }
    }

    const pct = aff.isMaxLevel ? 100 : Math.min(100, Math.round(((aff.exp - aff.minExp) / Math.max(1, aff.maxExp - aff.minExp)) * 100));
    const capText = aff.isDailyInteractionCapped
      ? `<span style="color:#e17055;" title="今日肢体/动作互动经验已达上限，对话与挂机无上限">今日互动 ${aff.dailyInteractionExp}/${aff.dailyInteractionLimit}(满)</span>`
      : `<span>今日互动 ${aff.dailyInteractionExp}/${aff.dailyInteractionLimit}</span>`;

    badge.innerHTML = `
      <div style="background:rgba(255,255,255,0.92);border:1px solid rgba(220,100,120,0.25);border-radius:10px;padding:7px 9px;margin:6px 0 8px 0;font-size:11px;color:#5a3a3a;box-shadow:0 3px 10px rgba(220,100,120,0.08);backdrop-filter:blur(6px);">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
          <span style="font-weight:bold;color:#b83a3a;display:flex;align-items:center;gap:4px;">
            <span>${aff.icon}</span> 羁绊等级 Lv.${aff.level}【${aff.stageName}】
          </span>
          <span style="font-size:10px;color:rgba(90,58,58,0.7);">${aff.isMaxLevel ? `满级 (${aff.exp} EXP)` : `${aff.exp}/${aff.maxExp}`}</span>
        </div>
        <div style="width:100%;height:5px;background:rgba(220,100,120,0.12);border-radius:3px;overflow:hidden;">
          <div style="width:${pct}%;height:100%;background:linear-gradient(90deg, #f8a5c2, #e74c3c);border-radius:3px;transition:width 0.3s ease;"></div>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;margin-top:5px;font-size:10px;color:rgba(90,58,58,0.75);">
          <span>称呼:「${this._escapeHtml(aff.callName)}」· ${capText}</span>
          <button type="button" class="btn-open-memory-diary" style="background:linear-gradient(135deg, #ff758c 0%, #ff7eb3 100%);color:#fff;border:none;border-radius:12px;padding:2px 8px;font-size:10px;cursor:pointer;box-shadow:0 2px 5px rgba(255,117,140,0.3);transition:all 0.2s ease;">
            📖 羁绊手账
          </button>
        </div>
      </div>
    `;

    const diaryBtn = badge.querySelector('.btn-open-memory-diary');
    if (diaryBtn) {
      diaryBtn.onclick = (e) => {
        e.stopPropagation();
        window.app?.petMode?._toggleActionMenu?.(false);
        this.showMemoryDiary(id);
      };
    }
  }

  updateBondBadge() {
    this.renderBondBadge('pet-action-menu');
  }

  /** 安全转义 HTML 属性与文本，防止双引号或尖括号破坏 DOM 结构 */
  _escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /** 直接呼出隐藏彩蛋管理员控制台 */
  openAdminConsole(charId) {
    this._adminUnlocked = true;
    this.showMemoryDiary(charId, 'admin');
  }

  /**
   * 打开方案 C 角色专属二次元羁绊手账与记忆管理弹窗 (Memory Diary Modal)
   * @param {string} charId 角色 ID
   * @param {string} initialTab 初始页签 ('profile' | 'facts' | 'lore' | 'levels' | 'admin')
   */
  showMemoryDiary(charId, initialTab = 'profile') {
    let activeCharId = charId || window.characterManager?.getCurrentCharacter()?.id || 'ruoxi';
    if (initialTab === 'admin') this._adminUnlocked = true;

    const isCompact = window.innerWidth < 460;
    this.closeMemoryDiary();

    const overlay = document.createElement('div');
    overlay.id = 'pet-memory-diary-modal';
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(30, 20, 25, 0.45);
      backdrop-filter: blur(10px);
      z-index: 999999;
      display: flex;
      justify-content: center;
      align-items: center;
      opacity: 0;
      transition: opacity 0.25s ease;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      user-select: none;
    `;

    const modal = document.createElement('div');
    modal.style.cssText = `
      width: 540px;
      max-width: ${isCompact ? '95vw' : '92vw'};
      height: 580px;
      max-height: ${isCompact ? '92vh' : '90vh'};
      background: rgba(255, 253, 252, 0.97);
      border: 1px solid rgba(255, 140, 160, 0.35);
      border-radius: 16px;
      box-shadow: 0 16px 40px rgba(180, 50, 70, 0.22);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      transform: scale(0.96);
      transition: transform 0.25s ease;
    `;

    const header = document.createElement('div');
    header.style.cssText = `
      padding: ${isCompact ? '10px 12px' : '14px 18px'};
      background: linear-gradient(135deg, #fff0f3 0%, #ffe3e8 100%);
      border-bottom: 1px solid rgba(255, 180, 190, 0.4);
      display: flex;
      justify-content: space-between;
      align-items: center;
    `;

    // ★ 隐藏彩蛋计数器：在手账左上角等级图标/胶囊上 3.5 秒内连续点击 7 次即可解锁隐藏管理员模式
    let secretClickCount = 0;
    let secretClickTimer = null;

    const updateHeaderUI = () => {
      const lore = this.getCharacterLore(activeCharId);
      const aff = this.getAffinity(activeCharId);
      const callName = this.getCallName(activeCharId);

      header.innerHTML = `
        <div style="display:flex;align-items:center;gap:8px;min-width:0;">
          <span id="diary-secret-icon" style="font-size:${isCompact ? '18px' : '20px'};flex-shrink:0;transition:transform 0.15s ease;">${aff.icon}</span>
          <div style="min-width:0;">
            <div style="font-size:${isCompact ? '13px' : '14px'};font-weight:bold;color:#a82c40;display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
              <span>${this._escapeHtml(lore.diaryTitle)}</span>
              <span id="diary-secret-badge" style="font-size:10px;background:#ff6b81;color:#fff;padding:1px 6px;border-radius:8px;font-weight:normal;white-space:nowrap;">
                Lv.${aff.level} · ${this._escapeHtml(aff.stageName)}
              </span>
            </div>
            <div style="font-size:10px;color:#8f4a56;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
              ${this._escapeHtml(lore.workTitle)} · 专属称呼：「<b>${this._escapeHtml(callName)}</b>」 · 今日互动 ${aff.dailyInteractionExp}/${aff.dailyInteractionLimit} EXP
            </div>
          </div>
        </div>
        <button id="diary-close-btn" style="background:transparent;border:none;font-size:18px;color:#a82c40;cursor:pointer;padding:4px 8px;line-height:1;border-radius:6px;flex-shrink:0;">✕</button>
      `;

      const closeBtn = header.querySelector('#diary-close-btn');
      if (closeBtn) closeBtn.onclick = () => this.closeMemoryDiary();

      // 绑定深藏的 7 连击彩蛋暗门（普通人点 1~3 下毫无异样，连点 7 下解锁管理员模式）
      const handleSecretClick = () => {
        secretClickCount++;
        if (secretClickTimer) clearTimeout(secretClickTimer);
        secretClickTimer = setTimeout(() => { secretClickCount = 0; }, 3500);

        const iconEl = header.querySelector('#diary-secret-icon');
        if (secretClickCount >= 5 && secretClickCount < 7 && iconEl) {
          iconEl.style.transform = `scale(${1 + (secretClickCount - 4) * 0.15}) rotate(${(secretClickCount % 2 ? 12 : -12)}deg)`;
        }
        if (secretClickCount >= 7) {
          secretClickCount = 0;
          this._adminUnlocked = true;
          renderNavBar('admin');
          renderContent('admin');
        }
      };

      header.querySelector('#diary-secret-icon')?.addEventListener('click', handleSecretClick);
      header.querySelector('#diary-secret-badge')?.addEventListener('click', handleSecretClick);
    };

    const navBar = document.createElement('div');
    navBar.style.cssText = `
      display: flex;
      background: rgba(255, 245, 247, 0.9);
      border-bottom: 1px solid rgba(255, 190, 200, 0.3);
      padding: 0 ${isCompact ? '4px' : '10px'};
    `;
    const tabFont = isCompact ? '11px' : '12px';

    const renderNavBar = (activeTabKey) => {
      const adminTabHtml = this._adminUnlocked ? `
        <button class="diary-tab-btn ${activeTabKey === 'admin' ? 'active' : ''}" data-tab="admin" style="flex:1;padding:9px 2px;border:none;background:transparent;font-size:${tabFont};font-weight:${activeTabKey === 'admin' ? 'bold' : 'normal'};color:${activeTabKey === 'admin' ? '#8e44ad' : '#636e72'};cursor:pointer;border-bottom:2px solid ${activeTabKey === 'admin' ? '#8e44ad' : 'transparent'};white-space:nowrap;">
          👑 ${isCompact ? '神权' : '彩蛋管理'}
        </button>
      ` : '';

      navBar.innerHTML = `
        <button class="diary-tab-btn ${activeTabKey === 'profile' ? 'active' : ''}" data-tab="profile" style="flex:1;padding:9px 2px;border:none;background:transparent;font-size:${tabFont};font-weight:${activeTabKey === 'profile' ? 'bold' : 'normal'};color:${activeTabKey === 'profile' ? '#ff4757' : '#636e72'};cursor:pointer;border-bottom:2px solid ${activeTabKey === 'profile' ? '#ff4757' : 'transparent'};white-space:nowrap;">
          👤 ${isCompact ? '档案卡' : '专属称呼与档案'}
        </button>
        <button class="diary-tab-btn ${activeTabKey === 'facts' ? 'active' : ''}" data-tab="facts" style="flex:1;padding:9px 2px;border:none;background:transparent;font-size:${tabFont};font-weight:${activeTabKey === 'facts' ? 'bold' : 'normal'};color:${activeTabKey === 'facts' ? '#ff4757' : '#636e72'};cursor:pointer;border-bottom:2px solid ${activeTabKey === 'facts' ? '#ff4757' : 'transparent'};white-space:nowrap;">
          📝 ${isCompact ? '便签墙' : '回忆便签墙'}
        </button>
        <button class="diary-tab-btn ${activeTabKey === 'lore' ? 'active' : ''}" data-tab="lore" style="flex:1;padding:9px 2px;border:none;background:transparent;font-size:${tabFont};font-weight:${activeTabKey === 'lore' ? 'bold' : 'normal'};color:${activeTabKey === 'lore' ? '#ff4757' : '#636e72'};cursor:pointer;border-bottom:2px solid ${activeTabKey === 'lore' ? '#ff4757' : 'transparent'};white-space:nowrap;">
          📘 ${isCompact ? '设定集' : '官方正统设定'}
        </button>
        <button class="diary-tab-btn ${activeTabKey === 'levels' ? 'active' : ''}" data-tab="levels" style="flex:1;padding:9px 2px;border:none;background:transparent;font-size:${tabFont};font-weight:${activeTabKey === 'levels' ? 'bold' : 'normal'};color:${activeTabKey === 'levels' ? '#ff4757' : '#636e72'};cursor:pointer;border-bottom:2px solid ${activeTabKey === 'levels' ? '#ff4757' : 'transparent'};white-space:nowrap;">
          🏆 ${isCompact ? '十阶篇' : '原作十阶篇章'}
        </button>
        ${adminTabHtml}
      `;

      navBar.querySelectorAll('.diary-tab-btn').forEach(btn => {
        btn.onclick = () => {
          const targetTab = btn.getAttribute('data-tab');
          renderNavBar(targetTab);
          renderContent(targetTab);
        };
      });
    };

    const body = document.createElement('div');
    body.style.cssText = `
      flex: 1;
      overflow-y: auto;
      padding: ${isCompact ? '12px' : '16px'};
      position: relative;
    `;

    const renderContent = (tabKey) => {
      const lore = this.getCharacterLore(activeCharId);
      const aff = this.getAffinity(activeCharId);
      const char = window.characterManager?.registry?.[activeCharId] || window.characterManager?.getCurrentCharacter();
      const charName = char?.name || lore.name;
      const p = this.memoryData.masterProfile;

      if (tabKey === 'profile') {
        const curCall = this.getCallName(activeCharId);
        body.innerHTML = `
          <div style="font-size:12px;color:#2f3542;">
            <div style="background:rgba(255,240,245,0.7);border:1px dashed #ffb8b8;border-radius:8px;padding:8px 12px;margin-bottom:12px;font-size:11px;color:#b33939;line-height:1.5;">
              💡 <b>${this._escapeHtml(charName)}专属贴士</b>：${this._escapeHtml(lore.diaryTip)}
            </div>
            
            <div style="margin-bottom:10px;">
              <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:4px;margin-bottom:4px;">
                <label style="font-weight:bold;color:#a82c40;">${this._escapeHtml(charName)} 对你的专属称呼（默认：${this._escapeHtml(lore.defaultCallName)}）：</label>
                <button id="btn-reset-default-call" type="button" style="background:transparent;border:1px solid #ff7675;color:#d63031;border-radius:4px;font-size:10px;padding:1px 6px;cursor:pointer;">恢复默认「${this._escapeHtml(lore.defaultCallName)}」</button>
              </div>
              <input id="input-master-name" type="text" value="${this._escapeHtml(curCall)}" placeholder="官方默认：${this._escapeHtml(lore.defaultCallName)}" style="width:100%;box-sizing:border-box;padding:7px 10px;border:1px solid #ffd1d8;border-radius:8px;font-size:12px;outline:none;" />
            </div>

            <div style="margin-bottom:10px;">
              <label style="display:block;font-weight:bold;margin-bottom:4px;color:#a82c40;">你的现实身份 / 职业：</label>
              <input id="input-master-identity" type="text" value="${this._escapeHtml(p.identity || '')}" placeholder="例如：全栈开发者 / 学生 / 创作者" style="width:100%;box-sizing:border-box;padding:7px 10px;border:1px solid #ffd1d8;border-radius:8px;font-size:12px;outline:none;" />
            </div>

            <div style="margin-bottom:10px;">
              <label style="display:block;font-weight:bold;margin-bottom:4px;color:#a82c40;">你的生活偏好与习惯（多个用逗号或顿号隔开）：</label>
              <input id="input-master-habits" type="text" value="${this._escapeHtml((p.habits || []).join('、'))}" placeholder="例如：爱喝冰美式、习惯深夜写代码" style="width:100%;box-sizing:border-box;padding:7px 10px;border:1px solid #ffd1d8;border-radius:8px;font-size:12px;outline:none;" />
            </div>

            <div style="margin-bottom:10px;">
              <label style="display:block;font-weight:bold;margin-bottom:4px;color:#a82c40;">近期心境 / 当前小目标：</label>
              <textarea id="input-master-mood" rows="2" placeholder="例如：正在推进重要项目，希望得到鼓励" style="width:100%;box-sizing:border-box;padding:7px 10px;border:1px solid #ffd1d8;border-radius:8px;font-size:12px;outline:none;resize:none;">${this._escapeHtml(p.recentMood || '')}</textarea>
            </div>

            <div style="margin-bottom:14px;">
              <label style="display:block;font-weight:bold;margin-bottom:4px;color:#a82c40;">重要备忘事项（每行一条）：</label>
              <textarea id="input-master-memos" rows="2" placeholder="例如：每晚11点前休息" style="width:100%;box-sizing:border-box;padding:7px 10px;border:1px solid #ffd1d8;border-radius:8px;font-size:12px;outline:none;resize:none;">${this._escapeHtml((p.memos || []).join('\n'))}</textarea>
            </div>

            <div style="display:flex;justify-content:flex-end;">
              <button id="btn-save-master-profile" style="background:linear-gradient(135deg, #ff758c 0%, #ff7eb3 100%);color:#fff;border:none;border-radius:8px;padding:8px 20px;font-size:12px;font-weight:bold;cursor:pointer;box-shadow:0 3px 8px rgba(255,117,140,0.3);">
                💾 保存手账档案并同步给 ${this._escapeHtml(charName)}
              </button>
            </div>
          </div>
        `;

        const resetCallBtn = body.querySelector('#btn-reset-default-call');
        if (resetCallBtn) {
          resetCallBtn.onclick = () => {
            const nameInput = body.querySelector('#input-master-name');
            if (nameInput) nameInput.value = lore.defaultCallName;
          };
        }

        const saveBtn = body.querySelector('#btn-save-master-profile');
        if (saveBtn) {
          saveBtn.onclick = () => {
            const name = body.querySelector('#input-master-name')?.value || lore.defaultCallName;
            const identity = body.querySelector('#input-master-identity')?.value || '';
            const habits = body.querySelector('#input-master-habits')?.value || '';
            const recentMood = body.querySelector('#input-master-mood')?.value || '';
            const memos = body.querySelector('#input-master-memos')?.value || '';

            this.updateMasterProfile({ charId: activeCharId, name, identity, habits, recentMood, memos });
            updateHeaderUI();
            this.updateBondBadge();
            saveBtn.textContent = '✨ 已同步至角色记忆！';
            saveBtn.style.background = '#2ed573';
            setTimeout(() => {
              if (saveBtn) {
                saveBtn.textContent = `💾 保存手账档案并同步给 ${charName}`;
                saveBtn.style.background = 'linear-gradient(135deg, #ff758c 0%, #ff7eb3 100%)';
              }
            }, 1200);
          };
        }

      } else if (tabKey === 'facts') {
        const facts = this.memoryData.facts || [];
        const factsHtml = facts.map(f => {
          const isUser = f.source === 'user';
          const badgeBg = isUser ? '#ff6b81' : '#70a1ff';
          const badgeText = isUser ? '✏️ 手账录入' : '🤖 灵犀捕捉';
          return `
            <div style="background:rgba(255,255,255,0.9);border:1px solid #ffeaa7;border-left:4px solid ${isUser ? '#ff7675' : '#74b9ff'};border-radius:8px;padding:8px 10px;margin-bottom:8px;box-shadow:0 2px 5px rgba(0,0,0,0.03);display:flex;justify-content:space-between;align-items:flex-start;">
              <div style="flex:1;margin-right:10px;min-width:0;word-break:break-word;">
                <div style="display:flex;align-items:center;gap:6px;margin-bottom:3px;flex-wrap:wrap;">
                  <span style="font-size:9px;color:#fff;background:${badgeBg};padding:1px 5px;border-radius:4px;">${badgeText}</span>
                  <span style="font-size:10px;color:#a4b0be;">${this._escapeHtml(f.time)}</span>
                </div>
                <div style="font-size:12px;color:#2f3542;line-height:1.4;">${this._escapeHtml(f.text)}</div>
              </div>
              <button class="btn-del-fact" data-id="${this._escapeHtml(f.id)}" title="删除此条记忆" style="background:transparent;border:none;cursor:pointer;color:#e74c3c;font-size:13px;padding:2px 4px;flex-shrink:0;">🗑️</button>
            </div>
          `;
        }).join('');

        body.innerHTML = `
          <div>
            <div style="background:linear-gradient(135deg, #fff5f5 0%, #fff8e7 100%);border:1px solid #ffd1d8;border-radius:10px;padding:10px;margin-bottom:12px;">
              <div style="font-size:11px;font-weight:bold;color:#d63031;margin-bottom:6px;">➕ 贴一张与 ${this._escapeHtml(charName)} 的新回忆便签（手动记录每次奖励 +5 EXP）：</div>
              <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:4px;">
                <select id="select-fact-category" style="padding:5px 8px;border:1px solid #ffccd2;border-radius:6px;font-size:11px;outline:none;background:#fff;color:#555;">
                  <option value="promise">🌸 专属约定</option>
                  <option value="preference">☕ 个人喜好</option>
                  <option value="memo">📌 重要备忘</option>
                  <option value="mood">💫 共同心境</option>
                  <option value="custom">🌟 珍贵回忆</option>
                </select>
                <input id="input-new-fact" type="text" placeholder="写下你想让 ${this._escapeHtml(charName)} 记住的事..." style="flex:1;min-width:140px;padding:5px 8px;border:1px solid #ffccd2;border-radius:6px;font-size:11px;outline:none;" />
                <button id="btn-add-fact" style="background:#ff7675;color:#fff;border:none;border-radius:6px;padding:5px 12px;font-size:11px;font-weight:bold;cursor:pointer;white-space:nowrap;">记入手账</button>
              </div>
            </div>

            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;font-size:11px;color:#888;">
              <span>共沉淀 ${facts.length} 条珍贵回忆便签</span>
              ${facts.length > 0 ? '<button id="btn-clear-facts" type="button" style="background:transparent;border:none;color:#999;cursor:pointer;text-decoration:underline;font-size:10px;">清空全部便签</button>' : ''}
            </div>

            <div id="facts-list-container">
              ${facts.length > 0 ? factsHtml : '<div style="text-align:center;color:#b2bec3;font-size:12px;padding:30px 0;">手账里还没有便签哦，快在上方记录第一条回忆吧～🌱</div>'}
            </div>
          </div>
        `;

        const addBtn = body.querySelector('#btn-add-fact');
        const inputFact = body.querySelector('#input-new-fact');
        const selCat = body.querySelector('#select-fact-category');
        if (addBtn && inputFact) {
          const doAdd = () => {
            const txt = inputFact.value?.trim();
            if (!txt) return;
            this.addCustomFact(txt, selCat.value, 'user');
            inputFact.value = '';
            updateHeaderUI();
            renderContent('facts');
            this.updateBondBadge();
          };
          addBtn.onclick = doAdd;
          inputFact.onkeydown = (e) => { if (e.key === 'Enter') doAdd(); };
        }

        body.querySelectorAll('.btn-del-fact').forEach(btn => {
          btn.onclick = () => {
            this.removeFact(btn.getAttribute('data-id'));
            renderContent('facts');
            this.updateBondBadge();
          };
        });

        const clearBtn = body.querySelector('#btn-clear-facts');
        if (clearBtn) {
          let confirmPending = false;
          let confirmTimer = null;
          clearBtn.onclick = () => {
            if (!confirmPending) {
              confirmPending = true;
              clearBtn.textContent = '⚠️ 确认清空？再点一次';
              clearBtn.style.color = '#ff4757';
              clearBtn.style.fontWeight = 'bold';
              confirmTimer = setTimeout(() => {
                confirmPending = false;
                if (clearBtn) {
                  clearBtn.textContent = '清空全部便签';
                  clearBtn.style.color = '#999';
                  clearBtn.style.fontWeight = 'normal';
                }
              }, 3000);
            } else {
              if (confirmTimer) clearTimeout(confirmTimer);
              this.clearFacts();
              renderContent('facts');
              this.updateBondBadge();
            }
          };
        }

      } else if (tabKey === 'lore') {
        const curPersona = this.getPersonaVersion(activeCharId);
        const personas = Object.values(this.PERSONA_VERSIONS);
        const personasHtml = personas.map(pItem => {
          const isSelected = pItem.id === curPersona.id;
          return `
            <div class="persona-option-card" data-key="${pItem.id}" style="border:1.5px solid ${isSelected ? '#ff4757' : '#ffd1d8'};background:${isSelected ? 'rgba(255,240,243,0.95)' : 'rgba(255,255,255,0.85)'};border-radius:8px;padding:8px 10px;margin-bottom:6px;cursor:pointer;">
              <div style="display:flex;justify-content:space-between;align-items:center;">
                <span style="font-weight:bold;font-size:12px;color:#2f3542;">${pItem.name}</span>
                ${isSelected ? '<span style="color:#ff4757;font-weight:bold;font-size:11px;">✓ 当前启用</span>' : '<span style="color:#999;font-size:10px;">点击切换</span>'}
              </div>
              <div style="font-size:11px;color:#57606f;margin-top:2px;">${pItem.desc}</div>
            </div>
          `;
        }).join('');

        body.innerHTML = `
          <div style="font-size:12px;color:#2f3542;">
            <div style="background:#fff5f7;border:1px solid #ffd1d8;border-radius:10px;padding:12px;margin-bottom:12px;">
              <div style="font-weight:bold;color:#a82c40;font-size:13px;margin-bottom:8px;">📘 ${lore.name} · 官方正统考据设定集</div>
              <div style="margin-bottom:5px;"><b>🎬 原作出处</b>：${lore.workTitle}</div>
              <div style="margin-bottom:5px;"><b>🎂 官方生日/档案</b>：${lore.officialBirthday}</div>
              <div style="margin-bottom:5px;"><b>💞 关系定位</b>：${lore.relationName}（官方称呼：「<b>${lore.defaultCallName}</b>」）</div>
              <div style="margin-bottom:5px;"><b>💖 官方喜好</b>：${lore.officialLikes}</div>
              <div style="margin-bottom:5px;"><b>🚫 官方讨厌/弱点</b>：${lore.officialDislikes}</div>
              <div style="margin-top:8px;padding-top:6px;border-top:1px dashed #ffb8b8;font-size:11px;color:#c0392b;">
                🛡️ <b>防崩坏保护已开启</b>：${lore.antiOocRule}
              </div>
            </div>

            <div style="font-weight:bold;color:#a82c40;font-size:12px;margin-bottom:6px;">🌸 互动微妙倾向调节（严格在原作设定内演绎）：</div>
            ${personasHtml}
          </div>
        `;

        body.querySelectorAll('.persona-option-card').forEach(card => {
          card.onclick = () => {
            const key = card.getAttribute('data-key');
            this.setPersonaVersion(activeCharId, key);
            renderContent('lore');
            this.updateBondBadge();
          };
        });

      } else if (tabKey === 'levels') {
        const ladderHtml = lore.stages.map((stg, idx) => {
          const expCfg = this.EXP_THRESHOLDS[idx];
          const isReached = aff.level >= stg.level;
          const isCurrent = aff.level === stg.level;
          return `
            <div style="border:1px solid ${isCurrent ? '#ff4757' : (isReached ? '#ffd1d8' : '#e0e0e0')};background:${isCurrent ? 'rgba(255,240,243,0.95)' : (isReached ? 'rgba(255,255,255,0.9)' : 'rgba(245,245,245,0.7)')};border-radius:8px;padding:8px 10px;margin-bottom:6px;display:flex;align-items:center;gap:10px;">
              <span style="font-size:18px;">${stg.icon}</span>
              <div style="flex:1;">
                <div style="display:flex;justify-content:space-between;align-items:center;">
                  <span style="font-weight:bold;font-size:12px;color:${isReached ? '#a82c40' : '#888'};">
                    Lv.${stg.level} · 《${stg.stageName}》
                    ${isCurrent ? '<span style="font-size:10px;background:#ff4757;color:#fff;padding:1px 5px;border-radius:4px;margin-left:6px;">当前篇章</span>' : ''}
                  </span>
                  <span style="font-size:10px;color:${isReached ? '#ff6b81' : '#aaa'};">${expCfg.minExp} EXP</span>
                </div>
                <div style="font-size:11px;color:${isReached ? '#555' : '#aaa'};margin-top:2px;">${stg.desc}</div>
              </div>
            </div>
          `;
        }).join('');

        body.innerHTML = `
          <div>
            <div style="background:#fff8f0;border:1px solid #ffd8a8;border-radius:8px;padding:8px 10px;margin-bottom:10px;font-size:11px;color:#b35c1e;line-height:1.5;">
              🌱 <b>经验获取与每日互动保护规则</b>：<br/>
              • <b>桌宠互动（每日上限 ${this.DAILY_INTERACTION_EXP_LIMIT} EXP）</b>：戳一戳触碰 <b>+2 EXP</b>，点选任意百宝箱动作/姿态 <b>+5 EXP</b>（今日已获：<b>${aff.dailyInteractionExp}/${aff.dailyInteractionLimit} EXP</b>，防无限连点刷级）。<br/>
              • <b>无上限自然陪伴</b>：正常 AI 聊天 <b>+3 EXP/次</b>（每日首聊 <b>+15 EXP</b>）、桌面挂机陪伴 <b>+2 EXP/10分钟</b>、手账记录 <b>+5 EXP</b> 均无每日上限！
            </div>
            ${ladderHtml}
          </div>
        `;

      } else if (tabKey === 'admin') {
        // ★ 隐藏彩蛋管理员控制台 (Secret Easter-Egg Admin Mode)
        const charOptionsHtml = Object.values(this.CHARACTER_OFFICIAL_LORE).map(item => `
          <option value="${item.charId}" ${item.charId === activeCharId ? 'selected' : ''}>
            ${this._escapeHtml(item.name)} (${item.charId}) - Lv.${this.getAffinity(item.charId).level} [${this.getAffinity(item.charId).exp} EXP]
          </option>
        `).join('');

        const levelButtonsHtml = this.EXP_THRESHOLDS.map(cfg => {
          const stg = lore.stages[cfg.level - 1];
          const isCur = aff.level === cfg.level;
          return `
            <button type="button" class="btn-admin-jump-lvl" data-exp="${cfg.minExp}" data-lvl="${cfg.level}" style="padding:5px 6px;border-radius:6px;border:1px solid ${isCur ? '#8e44ad' : '#dcdde1'};background:${isCur ? '#f3e5f5' : '#fff'};color:${isCur ? '#6c3483' : '#2f3640'};font-size:11px;font-weight:${isCur ? 'bold' : 'normal'};cursor:pointer;text-align:center;">
              Lv.${cfg.level} (${cfg.minExp})<br/><span style="font-size:9px;opacity:0.8;">${this._escapeHtml(stg?.stageName || '')}</span>
            </button>
          `;
        }).join('');

        body.innerHTML = `
          <div style="font-size:12px;color:#2f3542;">
            <div style="background:linear-gradient(135deg, #2c1654 0%, #4a1c6d 100%);color:#fff;border-radius:10px;padding:12px;margin-bottom:12px;box-shadow:0 4px 12px rgba(74,28,109,0.25);">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
                <span style="font-weight:bold;font-size:13px;color:#f1c40f;">👑 创世神 · 隐藏管理员彩蛋控制台</span>
                <span style="font-size:10px;background:rgba(241,196,15,0.2);color:#f1c40f;padding:2px 6px;border-radius:6px;">Easter Egg Unlocked</span>
              </div>
              <div style="font-size:11px;color:#dcdde1;line-height:1.4;">
                可随时将任意角色的经验值初始化归零（0 EXP）、一键拉满（3600 EXP）或修改为任意指定数值。
              </div>
            </div>

            <div style="margin-bottom:12px;">
              <label style="display:block;font-weight:bold;color:#6c3483;margin-bottom:4px;">🎭 选择要调改的目标角色：</label>
              <select id="admin-char-select" style="width:100%;padding:7px 10px;border:1px solid #d2b4de;border-radius:8px;font-size:12px;font-weight:bold;color:#2c3e50;background:#fff;outline:none;">
                ${charOptionsHtml}
              </select>
            </div>

            <div style="background:#f8f4fc;border:1px solid #e8daef;border-radius:10px;padding:10px 12px;margin-bottom:12px;">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
                <span>当前状态：<b>${this._escapeHtml(charName)} · Lv.${aff.level}《${this._escapeHtml(aff.stageName)}》</b></span>
                <span style="color:#8e44ad;font-weight:bold;">当前经验：${aff.exp} EXP</span>
              </div>
              <div style="display:flex;justify-content:space-between;align-items:center;font-size:11px;color:#636e72;">
                <span>今日互动经验额度：<b>${aff.dailyInteractionExp} / ${aff.dailyInteractionLimit} EXP</b></span>
                <button id="btn-admin-reset-cap" type="button" style="background:#fff;border:1px solid #9b59b6;color:#8e44ad;border-radius:5px;padding:2px 8px;font-size:10px;cursor:pointer;">🔓 清零今日上限 (0/50)</button>
              </div>
            </div>

            <div style="margin-bottom:12px;">
              <label style="display:block;font-weight:bold;color:#6c3483;margin-bottom:5px;">⚡ 快捷初始化 / 满级神权操作：</label>
              <div style="display:flex;gap:8px;flex-wrap:wrap;">
                <button id="btn-admin-reset-zero" type="button" style="flex:1;background:#fff;border:1.5px solid #e74c3c;color:#c0392b;border-radius:8px;padding:8px 10px;font-size:12px;font-weight:bold;cursor:pointer;">
                  🔄 初始化为 0 (Lv.1 归零)
                </button>
                <button id="btn-admin-max-out" type="button" style="flex:1;background:linear-gradient(135deg, #8e44ad 0%, #9b59b6 100%);border:none;color:#fff;border-radius:8px;padding:8px 10px;font-size:12px;font-weight:bold;cursor:pointer;box-shadow:0 3px 8px rgba(142,68,173,0.3);">
                  🌕 直接调满级 (3600 EXP · Lv.10)
                </button>
              </div>
            </div>

            <div style="margin-bottom:12px;">
              <label style="display:block;font-weight:bold;color:#6c3483;margin-bottom:5px;">🎯 自定义精确修改经验数值 (EXP)：</label>
              <div style="display:flex;gap:8px;">
                <input id="admin-exp-input" type="number" min="0" max="999999" value="${aff.exp}" placeholder="输入任意经验数值 (如 0, 500, 3600)" style="flex:1;padding:7px 10px;border:1px solid #d2b4de;border-radius:8px;font-size:12px;outline:none;" />
                <button id="btn-admin-set-exp" type="button" style="background:#6c3483;color:#fff;border:none;border-radius:8px;padding:7px 16px;font-size:12px;font-weight:bold;cursor:pointer;white-space:nowrap;">
                  ⚡ 立即写入 EXP
                </button>
              </div>
            </div>

            <div style="margin-bottom:12px;">
              <label style="display:block;font-weight:bold;color:#6c3483;margin-bottom:5px;">🪜 指定等级一键直达 (Lv.1 ~ Lv.10)：</label>
              <div style="display:grid;grid-template-columns:repeat(5, 1fr);gap:5px;">
                ${levelButtonsHtml}
              </div>
            </div>

            <div style="padding-top:10px;border-top:1px dashed #d2b4de;display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;">
              <span style="font-size:11px;color:#7f8c8d;">🌐 全阵容 9 角色批量彩蛋：</span>
              <div style="display:flex;gap:6px;">
                <button id="btn-admin-all-zero" type="button" style="background:#f5f6fa;border:1px solid #dcdde1;color:#7f8c8d;border-radius:6px;padding:4px 8px;font-size:10px;cursor:pointer;">🧹 全员归零 (0 EXP)</button>
                <button id="btn-admin-all-max" type="button" style="background:#fff8e1;border:1px solid #f1c40f;color:#b7950b;border-radius:6px;padding:4px 8px;font-size:10px;font-weight:bold;cursor:pointer;">🌟 全员满级 (Lv.10)</button>
              </div>
            </div>
            <div id="admin-status-toast" style="margin-top:8px;font-size:11px;font-weight:bold;color:#27ae60;text-align:center;min-height:16px;"></div>
          </div>
        `;

        const showAdminToast = (msg) => {
          const el = body.querySelector('#admin-status-toast');
          if (el) el.textContent = msg;
        };

        const charSel = body.querySelector('#admin-char-select');
        if (charSel) {
          charSel.onchange = () => {
            activeCharId = charSel.value;
            updateHeaderUI();
            renderContent('admin');
          };
        }

        body.querySelector('#btn-admin-reset-cap')?.addEventListener('click', () => {
          this.adminResetDailyCap(activeCharId);
          updateHeaderUI();
          renderContent('admin');
          showAdminToast(`✅ 已将 ${charName} 今日互动经验上限重置为 0/${this.DAILY_INTERACTION_EXP_LIMIT}！`);
        });

        body.querySelector('#btn-admin-reset-zero')?.addEventListener('click', () => {
          this.adminResetCharacter(activeCharId);
          updateHeaderUI();
          renderContent('admin');
          showAdminToast(`🔄 已将 ${charName} 初始化归零为 0 EXP (Lv.1)！`);
        });

        body.querySelector('#btn-admin-max-out')?.addEventListener('click', () => {
          this.adminMaxOutCharacter(activeCharId, true);
          updateHeaderUI();
          renderContent('admin');
          showAdminToast(`🌕 已将 ${charName} 直接调至满级 3600 EXP (Lv.10)！`);
        });

        const expInput = body.querySelector('#admin-exp-input');
        const applyCustomExp = () => {
          const val = Math.max(0, parseInt(expInput?.value, 10) || 0);
          const updated = this.adminSetExp(activeCharId, val, { triggerCelebration: true });
          updateHeaderUI();
          renderContent('admin');
          showAdminToast(`⚡ 已将 ${charName} 经验修改为 ${updated.exp} EXP → Lv.${updated.level}《${updated.stageName}》！`);
        };
        body.querySelector('#btn-admin-set-exp')?.addEventListener('click', applyCustomExp);
        if (expInput) {
          expInput.onkeydown = (e) => { if (e.key === 'Enter') applyCustomExp(); };
        }

        body.querySelectorAll('.btn-admin-jump-lvl').forEach(btn => {
          btn.onclick = () => {
            const targetExp = parseInt(btn.getAttribute('data-exp'), 10) || 0;
            const updated = this.adminSetExp(activeCharId, targetExp, { triggerCelebration: true });
            updateHeaderUI();
            renderContent('admin');
            showAdminToast(`🪜 已跳级至 Lv.${updated.level}《${updated.stageName}》 (${updated.exp} EXP)！`);
          };
        });

        body.querySelector('#btn-admin-all-zero')?.addEventListener('click', () => {
          this.adminResetAllCharacters();
          updateHeaderUI();
          renderContent('admin');
          showAdminToast('🧹 已将全阵容 9 位角色全部初始化为 0 EXP (Lv.1)！');
        });

        body.querySelector('#btn-admin-all-max')?.addEventListener('click', () => {
          this.adminMaxOutAllCharacters();
          updateHeaderUI();
          renderContent('admin');
          showAdminToast('🌟 已将全阵容 9 位角色全部拉满至 Lv.10 (3600 EXP)！');
        });
      }
    };

    updateHeaderUI();
    renderNavBar(initialTab);
    renderContent(initialTab);

    modal.appendChild(header);
    modal.appendChild(navBar);
    modal.appendChild(body);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    overlay.onclick = (e) => {
      if (e.target === overlay) this.closeMemoryDiary();
    };

    requestAnimationFrame(() => {
      overlay.style.opacity = '1';
      modal.style.transform = 'scale(1)';
    });
  }

  /** 关闭手账弹窗 */
  closeMemoryDiary() {
    const existing = document.getElementById('pet-memory-diary-modal');
    if (existing) {
      existing.style.opacity = '0';
      setTimeout(() => existing.remove(), 250);
    }
  }

  // ============================================================================
  //  四、无感原型挂载与多模块协同 (Non-invasive Auto-Hook)
  // ============================================================================

  _autoHookModules() {
    const self = this;

    // 0. 绑定全局隐藏键盘彩蛋密令：Ctrl + Shift + A 直接呼出【创世神·隐藏管理员控制台】
    if (typeof document !== 'undefined' && !this._secretKeyHooked) {
      this._secretKeyHooked = true;
      document.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.shiftKey && (e.key === 'A' || e.key === 'a')) {
          e.preventDefault();
          self.openAdminConsole();
        }
      });
    }

    // 1. 拦截 ActionMenuManager：注入羁绊徽章 + 戳一戳加经验 + 点击任意百宝箱动作加经验（受每日 50 EXP 上限保护）
    if (typeof ActionMenuManager !== 'undefined' && !ActionMenuManager.prototype._emotionMemoryHooked) {
      ActionMenuManager.prototype._emotionMemoryHooked = true;
      const origRenderMenu = ActionMenuManager.prototype.renderMenu;
      ActionMenuManager.prototype.renderMenu = function(containerId, charId, onActionSelect) {
        origRenderMenu.apply(this, arguments);
        self.renderBondBadge(containerId, charId);
      };

      const origHandleTouch = ActionMenuManager.prototype.handleTouch;
      ActionMenuManager.prototype.handleTouch = function(charId, part, clickCount, context) {
        const res = origHandleTouch.apply(this, arguments);
        self.onPetTouch(charId, part);
        return res;
      };

      const origExecuteAction = ActionMenuManager.prototype.executeAction;
      ActionMenuManager.prototype.executeAction = function(charId, actionId, context) {
        const res = origExecuteAction.apply(this, arguments);
        self.onPetAction(charId, actionId);
        return res;
      };
    }

    // 1b. 延迟挂载晚于本脚本加载的模块（PetMode 的 _spriteCall / _toggleWander 及 DesktopButler 番茄钟）
    const hookLateModules = () => {
      const PetCls = (typeof PetMode !== 'undefined') ? PetMode : ((typeof PetModeManager !== 'undefined') ? PetModeManager : null);
      if (PetCls && !PetCls.prototype._emotionMemoryHooked) {
        PetCls.prototype._emotionMemoryHooked = true;
        const origSpriteCall = PetCls.prototype._spriteCall;
        if (origSpriteCall) {
          PetCls.prototype._spriteCall = function(action) {
            const res = origSpriteCall.apply(this, arguments);
            const cid = window.characterManager?.getCurrentCharacter()?.id || 'ruoxi';
            self.onPetAction(cid, action);
            return res;
          };
        }
        const origToggleWander = PetCls.prototype._toggleWander;
        if (origToggleWander) {
          PetCls.prototype._toggleWander = function(on) {
            const res = origToggleWander.apply(this, arguments);
            const cid = window.characterManager?.getCurrentCharacter()?.id || 'ruoxi';
            self.onPetAction(cid, 'wander');
            return res;
          };
        }
      }
      if (typeof DesktopButler !== 'undefined' && !DesktopButler.prototype._emotionMemoryHooked) {
        DesktopButler.prototype._emotionMemoryHooked = true;
        const origStartPomodoro = DesktopButler.prototype.startPomodoro;
        if (origStartPomodoro) {
          DesktopButler.prototype.startPomodoro = function() {
            const res = origStartPomodoro.apply(this, arguments);
            const cid = window.characterManager?.getCurrentCharacter()?.id || 'ruoxi';
            self.onPetAction(cid, 'pomodoro');
            return res;
          };
        }
      }
    };
    hookLateModules();
    if (typeof window !== 'undefined') {
      window.addEventListener('DOMContentLoaded', hookLateModules);
      setTimeout(hookLateModules, 200);
    }

    // 2. 拦截 MimoAPI.prototype._buildSystemPrompt，自动无感注入官方考据与长期记忆 Prompt（幂等防重锁）
    if (typeof MimoAPI !== 'undefined' && !MimoAPI.prototype._emotionMemoryHooked) {
      MimoAPI.prototype._emotionMemoryHooked = true;
      const origBuildSystemPrompt = MimoAPI.prototype._buildSystemPrompt;
      MimoAPI.prototype._buildSystemPrompt = function(isCodeMode) {
        let sys = origBuildSystemPrompt.apply(this, arguments);
        const charId = window.characterManager?.getCurrentCharacter()?.id || 'ruoxi';
        const snippet = self.getMemoryPromptSnippet(charId);
        if (snippet) {
          sys += `\n\n${snippet}`;
        }
        return sys;
      };

      const origSendMessageStream = MimoAPI.prototype.sendMessageStream;
      MimoAPI.prototype.sendMessageStream = async function(message, isCodeMode, onChunk) {
        const result = await origSendMessageStream.apply(this, arguments);
        const content = typeof result === 'object' ? result.content : result;
        self.onAiChatComplete(message, content);
        return result;
      };
    }

    // 3. 拦截 CharacterManager.prototype.switchCharacter，角色切换时自动注入高好感隐藏台词并更新徽章（幂等防重锁）
    if (typeof CharacterManager !== 'undefined' && !CharacterManager.prototype._emotionMemoryHooked) {
      CharacterManager.prototype._emotionMemoryHooked = true;
      const origSwitch = CharacterManager.prototype.switchCharacter;
      CharacterManager.prototype.switchCharacter = async function(characterId) {
        const ok = await origSwitch.apply(this, arguments);
        if (ok) {
          const aff = self.getAffinity(characterId);
          self.injectHighAffinityLines(characterId, aff.level);
          self.updateBondBadge();
        }
        return ok;
      };
    }
  }
}

// 挂载全局单例
window.emotionMemory = new EmotionMemory();

