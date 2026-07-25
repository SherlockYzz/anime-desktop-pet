<div align="center">

  <!-- ════════════════ 顶部渐变横幅 ════════════════ -->
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://user-images.githubusercontent.com/68841/232947385-a9881aa7-0a1e-43ab-8e6a-243a0b4d0d7c.png">
    <img width="800" src="https://user-images.githubusercontent.com/68841/232947385-a9881aa7-0a1e-43ab-8e6a-243a0b4d0d7c.png" alt="gradient divider">
  </picture>

  <h1>
    <img src="https://img.shields.io/badge/✨-二次元桌宠项目-ff69b4?style=for-the-badge" alt="Title">
    <br>
    <sub><sup>
      <img src="https://img.shields.io/badge/AI-桌面伴侣-ff69b4?style=flat-square" alt="AI Desktop Companion">
      <img src="https://img.shields.io/badge/v2.0.0-重磅升级-ff1493?style=flat-square" alt="v2.0.0">
    </sup></sub>
  </h1>

  <p>
    <strong style="font-size:1.1em;">
      <span style="color:#ff69b4;">Live2D 动态形象</span> ·
      <span style="color:#9370db;">五大角色</span> ·
      <span style="color:#00bfff;">AI 智能聊天</span> ·
      <span style="color:#ffa500;">原作台词集</span> ·
      <span style="color:#32cd32;">关键词触发</span>
    </strong>
  </p>

  <p>
    <img src="https://img.shields.io/github/license/SherlockYzz/anime-desktop-pet?style=for-the-badge&color=ff69b4" alt="License">
    <img src="https://img.shields.io/badge/Electron-28.x-47848f?style=for-the-badge&logo=electron&logoColor=white" alt="Electron">
    <img src="https://img.shields.io/badge/Live2D-Cubism-ff69b4?style=for-the-badge" alt="Live2D">
    <img src="https://img.shields.io/badge/Version-2.0.0-ff1493?style=for-the-badge" alt="Version">
    <img src="https://img.shields.io/badge/Build-Passing-brightgreen?style=for-the-badge" alt="Build">
  </p>

  <!-- 技术栈速览徽章 -->
  <p>
    <img src="https://img.shields.io/badge/JavaScript-ES2022-F7DF1E?style=flat-square&logo=javascript&logoColor=black" alt="JS">
    <img src="https://img.shields.io/badge/Node.js-16+-339933?style=flat-square&logo=node.js&logoColor=white" alt="Node">
    <img src="https://img.shields.io/badge/Three.js-3D-049EF4?style=flat-square&logo=three.js&logoColor=white" alt="Three.js">
    <img src="https://img.shields.io/badge/PIXI.js-渲染-FF6B6B?style=flat-square" alt="PIXI.js">
    <img src="https://img.shields.io/badge/OpenAI-API-412991?style=flat-square&logo=openai&logoColor=white" alt="OpenAI">
    <img src="https://img.shields.io/badge/Platforms-Win%20%7C%20Mac%20%7C%20Linux-0078D4?style=flat-square" alt="Platforms">
  </p>

  <br>
</div>

## <img src="https://img.shields.io/badge/📖-介绍-00BFFF?style=for-the-badge" alt="Intro">

**二次元桌宠项目** 是一款基于 **Electron** 的二次元桌面宠物应用。五位经典角色常驻桌面，陪你聊天、帮你写代码、给你打气！

**<span style="color:#ff1493;">v2.0.0 重磅升级</span>**：
- 🎉 **新增角色**：雪之下雪乃（春物）、高木同学（擅长捉弄的高木同学）
- 📚 **原作台词集系统**：每个角色独立的经典台词库，启动/点击/待机/告别时随机展示
- ⚡ **关键词触发台词**：聊天命中关键词自动触发角色台词，秒级响应
- 🔄 **角色顺序更换**：在设置中自由调整角色显示顺序
- 🔙 **恢复默认状态**：提示词和原作台词集均可一键恢复默认
- 💬 **原作台词集管理**：支持单条添加、批量导入、删除、编辑
- ⚖️ **三种 AI 回复模式**：即答/均衡/深度，灵活平衡速度与深度
- 💭 **思考过程折叠**：AI 思考过程自动折叠显示，阅读更清爽

**<span style="color:#9370db;">v1.3.0 新增</span>**：三种 AI 回复模式（即答/均衡/深度），思考过程折叠显示，响应速度大幅优化。

**<span style="color:#0078D4;">v1.2.0 新增</span>**：创建**自定义角色**，把你喜欢的任何角色（甚至原创角色）加入桌宠！支持导入/导出角色数据，轻松分享给朋友。

> 本项目完全开源免费，支持接入任意兼容 OpenAI 接口的大语言模型（如 DeepSeek、GPT、Claude 等）。

---

<div align="center">
  <h2>
    <img src="https://img.shields.io/badge/🛠️-技术架构-0078D4?style=for-the-badge" alt="Tech Stack">
  </h2>
</div>

<table align="center">
<tr>
  <td align="center" width="180">
    <img src="https://img.shields.io/badge/⚡-Electron-28-blueviolet?style=flat-square&logo=electron&logoColor=white" alt="Electron"><br>
    <b>桌面框架</b><br>
    <sub>跨平台透明窗口</sub>
  </td>
  <td align="center" width="180">
    <img src="https://img.shields.io/badge/🎭-Live2D-Cubism-ff69b4?style=flat-square" alt="Live2D"><br>
    <b>2D 动态引擎</b><br>
    <sub>PIXI.js + pixi-live2d-display</sub>
  </td>
  <td align="center" width="180">
    <img src="https://img.shields.io/badge/🧊-VRM-Three.js-049EF4?style=flat-square&logo=three.js&logoColor=white" alt="VRM"><br>
    <b>3D 模型渲染</b><br>
    <sub>@pixiv/three-vrm</sub>
  </td>
  <td align="center" width="180">
    <img src="https://img.shields.io/badge/🧠-AI-OpenAI-412991?style=flat-square&logo=openai&logoColor=white" alt="AI"><br>
    <b>大语言模型</b><br>
    <sub>OpenAI 兼容接口</sub>
  </td>
</tr>
</table>

<details>
<summary align="center"><b>📦 构建与部署</b></summary>
<br>

| 工具 | 用途 |
|:----:|:----:|
| **electron-builder** | 应用打包与安装程序生成 |
| **npm scripts** | `npm start` / `npm run build:win` |
| **NSIS** | Windows 安装程序 |
| **DMG** | macOS 磁盘映像 |
| **AppImage** | Linux 便携应用 |

</details>

---

<div align="center">
  <h2>
    <img src="https://img.shields.io/badge/🗺️-路线图-32CD32?style=for-the-badge" alt="Roadmap">
  </h2>
</div>

<table align="center">
<tr>
  <td align="center" width="50%">
    <span style="color:#32cd32;font-size:1.5em;">✅</span><br>
    <b style="color:#32cd32;">已完成</b>
  </td>
  <td align="center" width="50%">
    <span style="color:#ff69b4;font-size:1.5em;">🚀</span><br>
    <b style="color:#ff69b4;">计划中</b>
  </td>
</tr>
<tr>
  <td valign="top">

- ✅ 基础桌宠框架
- ✅ 多角色切换
- ✅ AI 聊天
- ✅ VRM 3D 模型支持
- ✅ 代码辅助
- ✅ **自定义角色创建**（v1.2.0）
- ✅ **角色导入/导出**（v1.2.0）
- ✅ **三种 AI 回复模式**（v1.3.0）
- ✅ **思考过程折叠展示**（v1.3.0）
- ✅ **响应速度优化**（v1.3.0）
- ✅ **新增雪之下雪乃、高木同学**（v2.0.0）
- ✅ **原作台词集系统**（v2.0.0）
- ✅ **关键词触发台词系统**（v2.0.0）
- ✅ **角色顺序更换**（v2.0.0）
- ✅ **恢复默认状态功能**（v2.0.0）

  </td>
  <td valign="top">

- 🚧 所有角色专属 Live2D 动态资源（制作中）
- 🚧 角色语音大模型合成 / 声库
- 🚧 更多角色（初音未来、时崎狂三...）
- 🚧 桌宠小游戏（戳泡泡、养成等）
- 🚧 插件系统
- 🚧 Mac/Linux 优化

  </td>
</tr>
</table>

---

## 功能特性

| 特性 | 说明 |
|------|------|
| 🎭 **多角色切换** | 五大经典角色，每个角色独立主题色、独立人设、独立台词 |
| 🎨 **Live2D 动态形象** | 生动表情和动作，点击互动有反馈 |
| 🧠 **AI 智能聊天** | 对接 AI 大模型，角色性格鲜明，记忆你的对话 |
| 📚 **原作台词集** | 独立经典台词库，启动/点击/待机/告别时随机展示 |
| ⚡ **关键词触发台词** | 聊天命中关键词自动触发台词，秒级响应 |
| ⚖️ **三种回复模式** | 即答/均衡/深度，自由平衡速度与内容深度 |
| 💭 **思考过程折叠** | AI 思考过程自动折叠，只展示最终回答 |
| 💻 **代码辅助** | 内置代码编辑器，AI 帮你写代码、改 Bug |
| 🪟 **透明悬浮** | 无边框透明窗口，始终置顶，不影响工作 |
| 🎯 **桌宠模式** | 迷你尺寸桌面宠物，陪伴感满分 |
| ⚙️ **丰富设置** | 自定义 API、模型、透明度、提示词等 |
| 🌈 **精美主题** | 每个角色独立配色，渐变色彩设计 |
| **➕ 自定义角色** | 创建属于你自己的桌宠角色，一切由你定义 |
| **📤 导入/导出** | 导出角色分享给朋友，或导入他人分享的角色 |
| 🔄 **角色顺序更换** | 在设置中自由调整角色显示顺序 |
| 🔙 **恢复默认状态** | 提示词和原作台词集均可一键恢复默认 |

## <img src="https://img.shields.io/badge/🎭-角色阵容-FF6B6B?style=for-the-badge" alt="Characters">

### <img src="https://img.shields.io/badge/⭐-内置角色-FFD700?style=flat-square" alt="Built-in">

<table>
<tr>
  <td align="center" width="200">
    <img src="https://raw.githubusercontent.com/SherlockYzz/anime-desktop-pet/main/%E8%A7%92%E8%89%B2-%E5%8A%A0%E8%97%A4%E6%83%A0/%E5%9B%BE%E7%89%87%E7%B4%A0%E6%9D%90/%E5%A4%B4%E5%83%8F.png" width="120" height="120" style="border-radius:50%"><br>
    <b>加藤惠</b><br>
    <sub>路人女主的养成方法</sub><br>
    <small>平淡吐槽 · 温柔包容</small>
  </td>
  <td align="center" width="200">
    <img src="https://raw.githubusercontent.com/SherlockYzz/anime-desktop-pet/main/%E8%A7%92%E8%89%B2-%E8%95%BE%E5%A7%86/%E5%9B%BE%E7%89%87%E7%B4%A0%E6%9D%90/%E5%A4%B4%E5%83%8F.png" width="120" height="120" style="border-radius:50%"><br>
    <b>蕾姆</b><br>
    <sub>Re:从零开始的异世界生活</sub><br>
    <small>温柔贤惠 · 坚定守护</small>
  </td>
  <td align="center" width="200">
    <img src="https://raw.githubusercontent.com/SherlockYzz/anime-desktop-pet/main/%E8%A7%92%E8%89%B2-%E9%9B%B6%E4%BA%8C/%E5%9B%BE%E7%89%87%E7%B4%A0%E6%9D%90/%E5%A4%B4%E5%83%8F.png" width="120" height="120" style="border-radius:50%"><br>
    <b>02</b><br>
    <sub>DARLING in the FRANXX</sub><br>
    <small>大胆奔放 · 天真妖媚</small>
  </td>
</tr>
<tr>
  <td align="center" width="200">
    <img src="https://raw.githubusercontent.com/SherlockYzz/anime-desktop-pet/main/%E8%A7%92%E8%89%B2-%E9%AB%98%E6%9C%A8%E5%90%8C%E5%AD%A6/%E5%9B%BE%E7%89%87%E7%B4%A0%E6%9D%90/%E5%A4%B4%E5%83%8F.png" width="120" height="120" style="border-radius:50%"><br>
    <b>高木同学</b><br>
    <sub>擅长捉弄的高木同学</sub><br>
    <small>调皮捉弄 · 温柔可爱</small>
  </td>
  <td align="center" width="200">
    <img src="https://raw.githubusercontent.com/SherlockYzz/anime-desktop-pet/main/%E8%A7%92%E8%89%B2-%E9%9B%AA%E4%B9%8B%E4%B8%8B%E9%9B%AA%E4%B9%83/%E5%9B%BE%E7%89%87%E7%B4%A0%E6%9D%90/%E5%A4%B4%E5%83%8F.png" width="120" height="120" style="border-radius:50%"><br>
    <b>雪之下雪乃</b><br>
    <sub>我的青春恋爱物语果然有问题</sub><br>
    <small>毒舌傲娇 · 冰山美人</small>
  </td>
  <td></td>
</tr>
</table>

### <img src="https://img.shields.io/badge/✨-自定义角色-v1.2.0-9370DB?style=flat-square" alt="Custom">（v1.2.0 新功能）

除了内置角色，你现在可以自由创建任意角色！初音未来、时崎狂三、甚至你原创的角色——只需填写设定、上传头像、编写系统提示词，即可拥有专属桌宠。

---

## <img src="https://img.shields.io/badge/🚀-快速开始-32CD32?style=for-the-badge" alt="Quick Start">

### <img src="https://img.shields.io/badge/📋-环境要求-0078D4?style=flat-square" alt="Requirements">

- [Node.js](https://nodejs.org/) 16+
- npm 或 yarn
- AI API Key（支持 OpenAI / DeepSeek / 任意兼容接口）

### <img src="https://img.shields.io/badge/📦-安装运行-FFA500?style=flat-square" alt="Install">

```bash
# 克隆仓库
git clone https://github.com/SherlockYzz/anime-desktop-pet.git
cd anime-desktop-pet

# 安装依赖
npm install

# 启动
npm start
```

### <img src="https://img.shields.io/badge/🔑-配置_AI-FF6B6B?style=flat-square" alt="Config">

1. 点击标题栏的 ⚙ 按钮打开设置
2. 输入 API 地址和 Key
3. 选择模型
4. 点击保存，开始聊天！

### <img src="https://img.shields.io/badge/⚖️-AI_回复模式-4ECDC4?style=flat-square" alt="AI Mode">

AI 提供三种回复模式，在设置面板切换，灵活平衡速度与深度：

| <span style="color:#FFD700;">模式</span> | <span style="color:#4ECDC4;">说明</span> | <span style="color:#FF6B6B;">适用场景</span> |
|------|------|----------|
| ⚡ **即答模式** | 快速回复，temperature 0.5，max_tokens 2048，思考精简 | <span style="color:#87CEEB;">日常聊天、快速问答</span> |
| ⚖️ **均衡模式** | 平衡速度与深度，temperature 0.7，max_tokens 4096 | <span style="color:#87CEEB;">一般对话、讨论</span> |
| 🧠 **深度模式** | 深度思考，temperature 0.8，max_tokens 8192 | <span style="color:#87CEEB;">复杂问题、详细分析</span> |

**思考过程折叠**：AI 的思考过程会单独折叠显示，聊天窗口只展示最终回答，阅读更清爽。点击"思考过程"即可展开查看。

> 默认使用**即答模式**。对话历史保留最近 3 轮，兼顾上下文连贯与响应速度。

### <img src="https://img.shields.io/badge/🎮-基础操作-9370DB?style=flat-square" alt="Controls">

| 操作 | 说明 |
|------|------|
| 拖拽标题栏 | 移动窗口 |
| 点击 👤 | 切换角色 |
| 单击角色 | 随机回应（优先从原作台词集选取） |
| 连续点击 | 触发吐槽/小情绪 |
| `Ctrl+Shift+P` | 显示/隐藏窗口 |

> 长时间无操作时，角色会主动找你聊天哦！部分角色还有生日彩蛋~

---

## <img src="https://img.shields.io/badge/🧩-角色三大模块详解-v2.0.0-ff69b4?style=for-the-badge" alt="Modules"> （v2.0.0 新增）

<div align="center">
  <img src="https://img.shields.io/badge/💡-每个角色由三个独立模块组成，理解这三个模块是使用本应用的关键-FFD700?style=flat-square" alt="Tip">
</div>

### <img src="https://img.shields.io/badge/模块-1-FF6B6B?style=flat-square&logo=openai&logoColor=white" alt="Module 1"> 系统提示词

**作用**：定义角色性格、说话方式、行为规则，是 AI 每次生成对话时读取的核心指令。

**怎么用**：
1. 打开设置面板（⚙ 按钮）
2. 找到「角色提示词设定」区域
3. 从下拉菜单选择要编辑的角色
4. 在文本框中修改提示词内容
5. 点击「保存此角色提示词」→ 立即生效

**恢复默认**：点击「恢复默认」按钮，提示词会回退到初始模板版本，你的自定义修改会被覆盖。

### <img src="https://img.shields.io/badge/模块-2-4ECDC4?style=flat-square&logo=data&logoColor=white" alt="Module 2"> 原作台词集（v2.0.0 新增）

**作用**：存放角色原作经典台词的独立台词库，用于启动、点击、待机、告别等核心场景。

**怎么用**：
1. 打开设置面板（⚙ 按钮）
2. 找到「原作台词集管理」区域
3. 从下拉菜单选择要管理的角色
4. **添加台词**：在输入框中输入一句台词，点击「添加」或按回车
5. **批量导入**：准备一个 `.txt` 文件（每行一句台词），点击「批量导入」选择文件
6. **删除台词**：将鼠标移到台词上，点击右侧的 `×` 按钮
7. **恢复默认**：点击「恢复默认」按钮，回退到初始台词集

**触发时机**：
- 应用启动时
- 用户点击角色时
- 角色待机闲置时
- 用户退出/告别时

### <img src="https://img.shields.io/badge/模块-3-A78BFA?style=flat-square&logo=data&logoColor=white" alt="Module 3"> 关键词触发台词集（v2.0.0 新增）

**作用**：当用户在聊天中输入包含特定关键词的消息时，角色会立即说一句对应的预设台词，然后 AI 继续正常回复。

**支持的关键词**：

| <span style="color:#FF6B6B;">你说的话包含...</span> | <span style="color:#4ECDC4;">角色会说...</span> |
|----------------|------------|
| <span style="color:#FFD700;">天气、下雨、下雪、晴天...</span> | <span style="color:#87CEEB;">天气相关台词</span> |
| <span style="color:#FFD700;">晚安、睡觉、困了...</span> | <span style="color:#87CEEB;">晚安台词</span> |
| <span style="color:#FFD700;">加油、好累、做不到...</span> | <span style="color:#87CEEB;">鼓励台词</span> |
| <span style="color:#FFD700;">好吃、美食、好饿...</span> | <span style="color:#87CEEB;">美食相关台词</span> |
| <span style="color:#FFD700;">做饭、料理、下厨...</span> | <span style="color:#87CEEB;">料理相关台词</span> |
| <span style="color:#FFD700;">夸我、表扬、厉害...</span> | <span style="color:#87CEEB;">夸奖台词</span> |
| <span style="color:#FFD700;">孤单、孤独、寂寞...</span> | <span style="color:#87CEEB;">孤独相关台词</span> |
| <span style="color:#FFD700;">怀疑自己、我不行...</span> | <span style="color:#87CEEB;">自我怀疑相关台词</span> |

**自定义触发台词**：打开角色的 `触发台词/` 文件夹，编辑对应的 `.txt` 文件（每行一句台词），重启应用后生效。

---

## <img src="https://img.shields.io/badge/➕-自定义角色功能-v1.2.0-9370DB?style=for-the-badge" alt="Custom Characters"> （v1.2.0）

### <img src="https://img.shields.io/badge/➕-创建角色-32CD32?style=flat-square" alt="Create">

1. 点击标题栏的 👤 按钮打开角色选择面板
2. 点击右上角的 **+** 按钮
3. 填写角色信息：
   - **角色名称**（必填）：如"初音未来"
   - **作品出处**（必填）：如"VOCALOID"
   - **一句话简介**：简短描述角色特点
   - **详细描述**：角色的背景故事和性格
   - **主题色**：选择主色调，系统会自动生成完整主题
   - **头像**（必填）：上传角色头像
   - **封面图**：可选的角色大图
   - **系统提示词**（必填）：**最关键的部分！** 定义角色的性格、说话方式、行为规则，直接决定 AI 扮演的质量
   - **原作台词集**（必填）：角色的经典台词，至少 1 句，每行一句
   - **Live2D 模型**：可选，上传 .model3.json 文件
4. 点击"创建角色"，角色会自动保存并出现在角色列表中

> **提示：** 系统提示词是决定角色扮演质量的关键。写得越详细，角色的表现越生动。可以参考内置角色的提示词写法。

### <img src="https://img.shields.io/badge/📤-导出角色-FFA500?style=flat-square" alt="Export">

1. 打开设置面板（⚙）
2. 在"角色提示词设定"区域，选择你的自定义角色
3. 点击"导出此角色"
4. 选择保存位置，会生成一个 `.json` 文件

导出的文件包含角色的所有数据（名称、设定、头像、封面、提示词、Live2D 模型），可以分享给朋友。

### <img src="https://img.shields.io/badge/📥-导入角色-0078D4?style=flat-square" alt="Import">

1. 点击角色选择面板的 **⬇**（导入）按钮
2. 选择其他人分享的 `.json` 角色数据文件
3. 角色会自动导入到你的桌宠中

### <img src="https://img.shields.io/badge/✏️-编辑角色提示词-FFD700?style=flat-square" alt="Edit">

1. 打开设置面板（⚙）
2. 在"角色提示词设定"区域，选择要编辑的角色
3. 在文本框中修改系统提示词
4. 点击"保存此角色提示词"，修改会立即生效

> 此功能也支持修改内置角色的提示词！

### <img src="https://img.shields.io/badge/🗑️-删除自定义角色-FF6B6B?style=flat-square" alt="Delete">

1. 在设置面板中选中自定义角色
2. 点击"删除此角色"
3. 确认删除（此操作不可撤销）

---

## <img src="https://img.shields.io/badge/🎨-角色定制（进阶）-A78BFA?style=for-the-badge" alt="Customize">

内置角色的台词、人设、主题色也可以自由编辑：

```
角色-加藤惠/
├── 角色设定.js        # 主题色、Live2D 配置
├── 系统提示词.txt      # AI 人设（可直接编辑）
├── 原作台词集.txt      # 原作经典台词（每行一句）
├── 图片素材/           # 头像和封面
└── 触发台词/           # 分类触发台词（每行一句）
    ├── 开机.txt、待机.txt、点击.txt、告别.txt
    ├── 吐槽.txt、温柔.txt、吃醋.txt、毒舌.txt
    ├── 捉弄.txt、调情.txt、孤独.txt、自我怀疑.txt
    ├── 天气.txt、夸奖.txt、晚安.txt、鼓励.txt
    └── 美食.txt、料理.txt、特殊.txt
```

想加新内置角色？复制角色文件夹，修改 `角色设定.js` 和台词即可！

> 对于大多数用户，推荐使用**自定义角色功能**（直接在应用内创建），无需手动编辑文件。

---

<div align="center">
  <h2>
    <img src="https://img.shields.io/badge/🤝-贡献-FF6B6B?style=for-the-badge" alt="Contributing">
  </h2>
  <p>欢迎提交 <b>Issue</b> 和 <b>PR</b>！一起让桌宠更可爱 ✨</p>
</div>

<div align="center">
  <h2>
    <img src="https://img.shields.io/badge/📄-许可证-MIT-32CD32?style=for-the-badge" alt="License">
  </h2>
  <p><a href="LICENSE"><img src="https://img.shields.io/github/license/SherlockYzz/anime-desktop-pet?style=flat-square&color=32CD32" alt="MIT License"></a></p>
</div>

---

<div align="center">

  <!-- 项目统计徽章 -->
  <p>
    <img src="https://img.shields.io/github/stars/SherlockYzz/anime-desktop-pet?style=social" alt="Stars">
    <img src="https://img.shields.io/github/forks/SherlockYzz/anime-desktop-pet?style=social" alt="Forks">
    <img src="https://img.shields.io/github/watchers/SherlockYzz/anime-desktop-pet?style=social" alt="Watchers">
  </p>

  <p>
    <a href="https://github.com/SherlockYzz/anime-desktop-pet">
      <img src="https://img.shields.io/badge/⭐_Star_支持-ff69b4?style=for-the-badge&logo=github&logoColor=white" alt="Star">
    </a>
    ·
    <a href="https://github.com/SherlockYzz/anime-desktop-pet/issues">
      <img src="https://img.shields.io/badge/🐛_反馈问题-FFA500?style=for-the-badge&logo=github&logoColor=white" alt="Issues">
    </a>
    ·
    <a href="https://github.com/SherlockYzz/anime-desktop-pet/discussions">
      <img src="https://img.shields.io/badge/💬_讨论交流-00BFFF?style=for-the-badge&logo=github&logoColor=white" alt="Discussions">
    </a>
  </p>

  <!-- 渐变分隔线 -->
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://user-images.githubusercontent.com/68841/232947385-a9881aa7-0a1e-43ab-8e6a-243a0b4d0d7c.png">
    <img width="800" src="https://user-images.githubusercontent.com/68841/232947385-a9881aa7-0a1e-43ab-8e6a-243a0b4d0d7c.png" alt="gradient divider">
  </picture>

  <p>
    <img src="https://img.shields.io/badge/Made_with_❤️_by-二次元爱好者-ff69b4?style=flat-square" alt="Made with love">
  </p>

  <p><sub>
    <img src="https://img.shields.io/badge/🎭_加藤惠-FF6B6B?style=flat-square" alt="Megumi">
    <img src="https://img.shields.io/badge/💙_蕾姆-4ECDC4?style=flat-square" alt="Rem">
    <img src="https://img.shields.io/badge/🔥_零2-FF4500?style=flat-square" alt="Zero Two">
    <img src="https://img.shields.io/badge/😊_高木同学-FFD700?style=flat-square" alt="Takagi">
    <img src="https://img.shields.io/badge/❄️_雪之下雪乃-87CEEB?style=flat-square" alt="Yukino">
  </sub></p>

</div>
