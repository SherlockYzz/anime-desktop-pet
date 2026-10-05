// ========================================
//  二次元桌宠 - 动作百宝箱与深度交互管理器
//  支持全角色动态姿态菜单、摸头/戳身触碰反馈、连击暴走、全角色CV语音联动
// ========================================

class ActionMenuManager {
  constructor() {
    // 角色专属姿态与动作数据库（8大角色完整覆盖 + 逐项专属CV语音绑定）
    this.ACTION_DATABASE = {
      // 1. 若曦（原创白狐仙 · ChatGPT Pets v2 精灵表 · 中文萌系仙狐声线）
      ruoxi: {
        title: '✨ 若曦姿态百宝箱',
        actions: [
          { id: 'idle', label: '待机呼吸·乖乖待命', icon: '🌸', kind: 'sprite', method: 'goIdle', voice: '01', bubble: '乖乖待命呼吸中~ 🌸' },
          { id: 'work', label: '伏案专注·打工模式', icon: '💼', kind: 'sprite', method: 'toggleWork', voice: '02', bubble: '开启专注工作模式！主人也要加油哦~' },
          { id: 'sleep', label: '抱尾入睡·呼噜呼噜', icon: '🌙', kind: 'sprite', method: 'toggleSleep', voice: '03', bubble: '抱紧暖暖的狐狸尾巴，呼噜噜入睡咯……🌙' },
          { id: 'wander', label: '自由漫步·桌面溜达', icon: '🐾', kind: 'wander', voice: '04', bubble: '好耶，我可以在桌面上溜达啦~' },
          { id: 'wave', label: '抬手问候·挥挥小爪', icon: '👋', kind: 'sprite', method: 'wave', voice: '05', bubble: '主人好呀！若曦随时都在呢~ 👋' },
          { id: 'jump', label: '纵身跃起·轻巧一跳', icon: '⚡', kind: 'sprite', method: 'jump', voice: '06', bubble: '嗖——！看若曦轻巧一跃！⚡' },
          { id: 'review', label: '呈递成果·请君检阅', icon: '📜', kind: 'sprite', method: 'review', voice: '07', bubble: '成果已经准备好啦，主人请检阅！📜' },
          { id: 'fail', label: '抱头沮丧·受阻缓和', icon: '😿', kind: 'sprite', method: 'fail', voice: '08', bubble: '呜……受阻了，容若曦抱头缓一缓。😿' },
          { id: 'wait', label: '歪头眨眼·静候指令', icon: '💭', kind: 'sprite', method: 'wait', voice: '09', bubble: '歪头等待主人的新指令中……💭' }
        ],
        touch: {
          head: { kind: 'sprite', method: 'wave', voice: '10', bubble: '摸摸狐狸耳朵好舒服呀~ (抖抖耳)' },
          body: { kind: 'sprite', method: 'jump', voice: '11', bubble: '戳戳我干嘛呀，主人～' },
          rage: { kind: 'sprite', method: 'fail', voice: '12', bubble: '呜哇！连续戳我这么多下，若曦要抗议啦！😿' }
        }
      },

      // 2. 加藤惠（路人女主的养成方法 · 索尼官方 Live2D · 安野希世乃温柔声线）
      megumi: {
        title: '🌸 加藤惠动作百宝箱',
        actions: [
          { id: 'fun', label: '身前搭手·开怀甜笑', icon: '😊', motion: 'I_FUN_W', expression: 'F_FUN', voice: '01', bubble: '欸嘿～今天的心情好像格外不错呢。' },
          { id: 'pout', label: '鼓嘴侧头·气鼓鼓', icon: '😤', motion: 'I_ANGRY_W', expression: 'F_ANGRY', voice: '02', bubble: '唔……又在做奇怪的事情了呢，真是拿你没办法。' },
          { id: 'surprise', label: '双手张开·后仰吃惊', icon: '😳', motion: 'I_SURPRISE_W', expression: 'F_SURPRISE', voice: '03', bubble: '呀！突然靠这么近……稍微有点吓到了呢。' },
          { id: 'shy', label: '垂首侧眸·委屈低语', icon: '🥺', motion: 'I_SAD_W', expression: 'F_SAD', voice: '04', bubble: '我的话，就算不说……你也应该明白吧？' },
          { id: 'idle_sway', label: '身姿轻摆·发丝微拂', icon: '✨', motion: 'IDLING_02', expression: 'F_FUN', voice: '05', bubble: '稍微整理一下发型……你觉得现在的我怎么样？' },
          { id: 'gentle', label: '优雅微倾·脉脉注视', icon: '☕', motion: 'I_FUN_S', expression: 'F_DOWN', voice: '06', bubble: '只要能一直在你身边，作为女主角我也很开心哦。' }
        ],
        touch: {
          head: { motion: 'I_FUN_W', expression: 'F_FUN', voice: '07', bubble: '摸头什么的……其实我不讨厌哦。' },
          body: { motion: 'I_SURPRISE_W', expression: 'F_SURPRISE', voice: '08', bubble: '哇，突然戳我……有点痒呢。' },
          rage: { motion: 'I_ANGRY_W', expression: 'F_ANGRY', voice: '09', bubble: '真是的！别再一直戳啦，我可要真正生气了哦！' }
        }
      },

      // 3. 惠惠（为美好的世界献上祝福！· Cubism 4 原版动画模型 · 高桥李依中二爆裂声线）
      megumin: {
        title: '💥 惠惠爆裂百宝箱',
        actions: [
          { id: 'explosion', label: '高举法杖·爆裂魔法！', icon: '💥', motion: '00_Skill_02', expression: '20_Expression_Serious_01', voice: '01', bubble: '比黑色更黑，比黑暗更暗的漆黑……Explosion！！' },
          { id: 'chant', label: '魔法手势·咒文吟唱', icon: '🔮', motion: '00_Skill_01', expression: '20_Expression_Anger_01', voice: '02', bubble: '吾名惠惠！乃红魔族第一大魔导、爆裂魔法操纵者！' },
          { id: 'proud', label: '单手叉腰·得意夸耀', icon: '👑', motion: '00_Pride_01', expression: '20_Expression_Smile_01', voice: '03', bubble: '哼哼！见识到我红魔族首屈一指的天才实力了吧！' },
          { id: 'bound', label: '高举双手·开心欢呼', icon: '⭐', motion: '00_Happy_01', expression: '20_Expression_Smile_01', voice: '04', bubble: '今天也是精神满满的一天呢！要一起去放爆裂魔法吗？' },
          { id: 'shame', label: '缩肩偏头·羞赧别过脸', icon: '😳', motion: '00_Shame_01', expression: '20_Expression_Shame_01', voice: '05', bubble: '突、突然摸我的帽子干嘛……这可是大魔导师的骄傲！' },
          { id: 'cry', label: '揉眼跺脚·瘫软哭闹', icon: '😭', motion: '00_Cry_01', expression: '20_Expression_Sad_01', voice: '06', bubble: '魔力耗尽动不了了啦！快背我回去，不然我就哭给你看！' }
        ],
        touch: {
          head: { motion: '00_Shame_01', expression: '20_Expression_Shame_01', voice: '07', bubble: '把手拿开啦……红魔族是不会轻易屈服于摸头杀的！' },
          body: { motion: '00_Pride_01', expression: '20_Expression_Serious_01', voice: '08', bubble: '休想打扰我感应大自然的魔力流动！' },
          rage: { motion: '00_Anger_01', expression: '20_Expression_Anger_01', voice: '09', bubble: '啊啊啊！不可饶恕！我要对你的屏幕使用爆裂魔法了！！' }
        }
      },

      // 4. 蕾姆（Re:从零开始的异世界生活 · 原版高模3D VRM + 水濑祈26段CV声库）
      rem: {
        title: '💙 蕾姆专属百宝箱',
        actions: [
          { id: 'curtsey', label: '双手交叠·躬身致礼', icon: '👗', vrmAnim: 'wave', voice: '01', bubble: '欢迎回来。罗兹瓦尔宅邸的女仆蕾姆，随时听候吩咐。' },
          { id: 'pray', label: '双手合十·胸前祈愿', icon: '🙏', vrmAnim: 'tap', voice: '03', bubble: '无论何时，蕾姆都会祈愿您平安顺遂。' },
          { id: 'shy', label: '单手抚颊·害羞侧首', icon: '🌸', vrmAnim: 'happy', voice: '07', bubble: '被您这样温柔地看着，蕾姆的脸……好像有点发烫。' },
          { id: 'fist', label: '屈臂握拳·前倾加油', icon: '👊', vrmAnim: 'nod', voice: '15', bubble: '不管是工作还是学习，蕾姆都会一直在身后支持您！' },
          { id: 'happy', label: '双臂挥舞·欢欣跃动', icon: '✨', vrmAnim: 'jump', voice: '20', bubble: '能像这样陪在您的身边，蕾姆感到由衷的幸福。' },
          { id: 'idle', label: '单手抚胸·静候吩咐', icon: '☕', vrmAnim: 'idle', voice: '02', bubble: '请问需要蕾姆为您泡一杯刚煮好的红茶吗？' }
        ],
        touch: {
          head: { vrmAnim: 'happy', voice: '05', bubble: '被摸头的感觉……好温暖，蕾姆最喜欢了。' },
          body: { vrmAnim: 'tap', voice: '09', bubble: '主、主人？请问有什么事情要吩咐蕾姆吗？' },
          rage: { vrmAnim: 'shake', voice: '18', bubble: '呜……请不要再捉弄蕾姆了，蕾姆也是会生气的哦！' }
        }
      },

      // 5. 初音未来（VOCALOID · 经典电子歌姬 · 藤田咲元气歌姬声线）
      miku: {
        title: '🎵 初音未来百宝箱',
        actions: [
          { id: 'shake', label: '甩双马尾·动感甩动', icon: '🎵', motion: 'miku_shake_01', voice: '02', bubble: '葱绿色的节拍在跳动！准备好和我一起演出了吗？' },
          { id: 'wave', label: '躬身致意·元气招手', icon: '👋', motion: 'miku_m_01', voice: '03', bubble: '哈喽！世界第一的公主殿下登场咯～！' },
          { id: 'heart', label: '左右晃动·舞台比心', icon: '💚', motion: 'miku_m_02', voice: '01', bubble: '将最纯净的心意，化作歌声传递到你的心底～♪' },
          { id: 'shy', label: '歪头侧身·轻柔微笑', icon: '🌸', motion: 'miku_m_03', voice: '05', bubble: '听见你的掌声，心跳好像有点加快了呢……' },
          { id: 'spin', label: '微仰节奏·舞台跃动', icon: '✨', motion: 'miku_m_04', voice: '04', bubble: '旋律在空气中回荡，一起跃动起来吧！' },
          { id: 'idle', label: '自然侍立·歌姬待机', icon: '🎤', motion: 'miku_idle_01', voice: '06', bubble: '嘀嗒嘀嗒……灵感的旋律正在源源不断地涌现！' }
        ],
        touch: {
          head: { motion: 'miku_m_03', voice: '07', bubble: '摸摸头发～接收到了满满的元气充电！' },
          body: { motion: 'miku_m_01', voice: '08', bubble: '准备好进入初音未来的音乐世界了吗？' },
          rage: { motion: 'miku_shake_01', voice: '09', bubble: '哇哇哇！马尾辫都要被你戳打结啦！>_<' }
        }
      },

      // 6. 高木同学（擅长捉弄的高木同学 · 经典捉弄 · 高桥李依俏皮少女声线）
      takagi: {
        title: '🍂 高木同学百宝箱',
        actions: [
          { id: 'tease', label: '歪头坏笑·西片捉弄', icon: '😏', motion: 'Tease', expression: 'TeaseSmile', voice: '01', bubble: '西片～刚才你是不是又在偷看我呀？脸都红了呢。' },
          { id: 'wink', label: '侧首眨眼·单眼Wink', icon: '😉', motion: 'Tease', expression: 'Wink', voice: '02', bubble: '今天我们的胜负……又是我赢了哦～嘻嘻。' },
          { id: 'surprise', label: '张嘴吃惊·略显意外', icon: '😳', motion: 'Surprised', expression: 'Surprised', voice: '03', bubble: '诶？！西片你……突然做什么啦！' },
          { id: 'blush', label: '托腮凝视·害羞脸红', icon: '😳', motion: 'Poke', expression: 'Blush', voice: '04', bubble: '突、突然靠这么近……稍微有点犯规了哦。' },
          { id: 'sleep', label: '阖眼趴桌·午间小憩', icon: '💤', motion: 'Sleep', expression: 'Sleepy', voice: '05', bubble: '午后的风吹得好舒服……稍微睡一会儿，不要偷偷捉弄我哦。' },
          { id: 'wakeup', label: '揉眼醒来·困倦微睁', icon: '🌤️', motion: 'WakeUp', expression: 'Neutral', voice: '06', bubble: '唔嗯……已经这个时间了吗？刚才做了个关于你的梦呢。' }
        ],
        touch: {
          head: { motion: 'Poke', expression: 'Blush', voice: '06', bubble: '西片，摸女孩子的头……可是要负责任的哦？' },
          body: { motion: 'Tease', expression: 'TeaseSmile', voice: '07', bubble: '想捉弄我吗？你的小动作早就被我看穿啦。' },
          rage: { motion: 'Surprised', expression: 'Surprised', voice: '08', bubble: '这么着急戳我，难道是承认今天输给我了吗？' }
        }
      },

      // 7. 零二（DARLING in the FRANXX · 户松遥妖娆达令御姐声线）
      zerotwo: {
        title: '🍯 零二姿态百宝箱',
        actions: [
          { id: 'darling', label: '我的达令', icon: '🍭', voice: '01', bubble: '找到了，我的达令～从今天起你就是我的专属驾驶员了！' },
          { id: 'tease', label: '调皮微笑', icon: '🍯', voice: '02', bubble: '怎么，害怕变成怪物吗？但我唯独不会伤害你哦。' },
          { id: 'lollipop', label: '叼棒棒糖', icon: '🍬', voice: '03', bubble: '甜甜的棒棒糖，要分你一半吗？' },
          { id: 'flight', label: '鹤望兰号', icon: '🚀', voice: '04', bubble: '跟我一起乘上鹤望兰号，冲破重力吧！' },
          { id: 'pout', label: '略略略', icon: '😜', voice: '05', bubble: '达令是个大笨蛋～不过，最喜欢你了。' }
        ],
        touch: {
          head: { voice: '06', bubble: '摸我的角？哼哼，胆子挺大的嘛，达令。' },
          body: { voice: '07', bubble: '跟我一起乘上鹤望兰号，飞向天空吧！' },
          rage: { voice: '08', bubble: '再戳我，小心我一口把你吃掉哦！' }
        }
      },

      // 8. 雪之下雪乃（我的青春恋爱喜剧果然有问题 · 早见沙织清冷高雅毒舌大小姐声线）
      yukino: {
        title: '🐱 雪乃姿态百宝箱',
        actions: [
          { id: 'read', label: '静心阅读', icon: '📖', voice: '01', bubble: '既然来了侍奉部，就请安静一些，不要打扰我看书。' },
          { id: 'sigh', label: '轻叹无奈', icon: '🐱', voice: '02', bubble: '你那独特的解决问题方式……虽然别扭，但意外地有效呢。' },
          { id: 'tea', label: '享用红茶', icon: '☕', voice: '03', bubble: '红茶已经泡好了。偶尔像这样安静地相处，也不算坏。' },
          { id: 'cat', label: '逗弄猫咪', icon: '🐾', voice: '04', bubble: '潘先生的玩偶……才、才没有很可爱呢。' },
          { id: 'smile', label: '冰融微笑', icon: '🌸', voice: '05', bubble: '如果可以的话，以后也请多指教了。' }
        ],
        touch: {
          head: { voice: '06', bubble: '请自重……不要对我做这种无意义的轻浮举动。' },
          body: { voice: '07', bubble: '有什么侍奉部的委托需要提出吗？' },
          rage: { voice: '08', bubble: '毫无常识的纠缠行为，请容我明确表示拒绝。' }
        }
      }
    };
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

    menu.innerHTML = `
      <div class="pet-action-title">${data.title}</div>
      <div class="pet-action-grid">
        ${data.actions.map(act => `
          <button class="pet-action-item" data-action="${act.id}">
            <span class="action-icon">${act.icon}</span>${act.label}
          </button>
        `).join('')}
      </div>
      <div class="pet-action-footer" style="display:flex;gap:6px;margin-top:8px;padding-top:6px;border-top:1px dashed rgba(217,79,79,0.2);">
        <button class="pet-action-footer-btn btn-open-scale-from-menu" style="flex:1;padding:5px 6px;font-size:11px;border-radius:6px;border:1px solid rgba(217,79,79,0.25);background:rgba(255,255,255,0.9);cursor:pointer;color:#b83a3a;display:flex;align-items:center;justify-content:center;gap:3px;">
          <span>📐</span> 调节大小
        </button>
        <button class="pet-action-footer-btn btn-exit-pet-from-menu" style="flex:1;padding:5px 6px;font-size:11px;border-radius:6px;border:1px solid #d94f4f;background:#d94f4f;color:#fff;cursor:pointer;font-weight:bold;display:flex;align-items:center;justify-content:center;gap:3px;">
          <span>🔄</span> 切回网页
        </button>
      </div>
    `;

    // 重新绑定点击事件
    menu.onclick = (e) => {
      e.stopPropagation();
      if (e.target.closest('.btn-open-scale-from-menu')) {
        menu.classList.remove('show');
        window.app?.petMode?._toggleScaleMenu?.(true);
        return;
      }
      if (e.target.closest('.btn-exit-pet-from-menu')) {
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

  /** 执行具体动作 */
  executeAction(charId, actionId, context) {
    const id = charId || window.characterManager?.getCurrentCharacter()?.id || 'ruoxi';
    const data = this.getCharacterActions(id);
    const act = data.actions.find(a => a.id === actionId);
    if (!act) return;

    const petMode = window.app?.petMode;
    const model = context?.model || petMode?._model;

    // 1. 若曦精灵表角色
    if (act.kind === 'sprite' || (id === 'ruoxi' && window.spriteAtlasManager)) {
      if (act.id === 'wander') {
        petMode?._toggleWander?.();
      } else if (petMode?._spriteCall) {
        petMode._spriteCall(act.id);
      } else if (window.spriteAtlasManager && typeof window.spriteAtlasManager[act.method] === 'function') {
        window.spriteAtlasManager[act.method]();
      }
    }
    // 2. 漫步
    else if (act.kind === 'wander') {
      petMode?._toggleWander?.();
    }
    // 3. VRM 动作分发
    else if (act.vrmAnim || petMode?._renderMode === 'vrm' || window.vrmManager?.vrm) {
      if (window.vrmManager) {
        window.vrmManager.playAnimation?.(act.vrmAnim || 'tap');
      }
    }
    // 4. Live2D 动作分发
    else if (model) {
      if (act.motion) {
        this.playModelMotion(model, act.motion);
      }
      if (act.expression) {
        this.playModelExpression(model, act.expression);
      }
    }

    // 5. 气泡台词展示
    if (act.bubble && petMode?._showBubble) {
      petMode._showBubble(act.bubble);
    }

    // 6. 原生语音联动（全角色支持）
    if (act.voice && window.characterManager?.playVoice) {
      window.characterManager.playVoice(id, act.voice);
    } else if (window.characterManager?.playRandomVoice) {
      window.characterManager.playRandomVoice(id);
    }
    return true;
  }

  /** 触碰交互处理（摸头/戳身/连续狂点暴走） */
  handleTouch(charId, part, clickCount, context) {
    const id = charId || window.characterManager?.getCurrentCharacter()?.id || 'ruoxi';
    const data = this.getCharacterActions(id);
    const petMode = window.app?.petMode;
    const model = context?.model || petMode?._model;

    const touchKey = clickCount >= 3 ? 'rage' : (part === 'head' ? 'head' : 'body');
    const touch = data.touch?.[touchKey] || data.touch?.body;
    if (!touch) return;

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

    // 3. 原生 CV 语音联动（全角色触碰发声）
    if (touch.voice && window.characterManager?.playVoice) {
      window.characterManager.playVoice(id, touch.voice);
    } else if (window.characterManager?.playRandomVoice) {
      window.characterManager.playRandomVoice(id);
    }

    // 4. 气泡台词
    if (touch.bubble && petMode?._showBubble) {
      petMode._showBubble(touch.bubble);
    }
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
