<div align="center">
  <h1>✨ 二次元桌宠项目 · AI 桌面伴侣</h1>
  <p>
    <strong>Live2D 动态形象 · 多角色切换 · AI 智能聊天 · 代码辅助</strong>
  </p>
  <p>
    <img src="https://img.shields.io/github/license/SherlockYzz/anime-desktop-pet?style=for-the-badge" alt="License">
    <img src="https://img.shields.io/badge/Electron-28.x-blue?style=for-the-badge&logo=electron" alt="Electron">
    <img src="https://img.shields.io/badge/Live2D-Cubism-ff69b4?style=for-the-badge" alt="Live2D">
  </p>
  <br>
</div>

## 介绍

**二次元桌宠项目** 是一款基于 **Electron** 的二次元桌面宠物应用。让加藤惠、蕾姆、02 等经典角色常驻你的桌面，陪你聊天、帮你写代码、给你打气！

> 本项目完全开源免费，支持接入任意兼容 OpenAI 接口的大语言模型（如 DeepSeek、GPT、Claude 等）。

## 角色阵容

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
</table>

## 功能特性

| 特性 | 说明 |
|------|------|
| 🎭 **多角色切换** | 一键切换角色，每个角色独立主题色、独立人设、独立台词 |
| 🎨 **Live2D 动态形象** | 生动表情和动作，点击互动有反馈 |
| 🧠 **AI 智能聊天** | 对接 AI 大模型，角色性格鲜明，记忆你的对话 |
| 💻 **代码辅助** | 内置代码编辑器，AI 帮你写代码、改 Bug |
| 🪟 **透明悬浮** | 无边框透明窗口，始终置顶，不影响工作 |
| 🎯 **桌宠模式** | 迷你尺寸桌面宠物，陪伴感满分 |
| ⚙️ **丰富设置** | 自定义 API、模型、透明度、开机自启等 |
| 🌈 **精美主题** | 每个角色独立配色，渐变色彩设计 |

## 快速开始

### 环境要求

- [Node.js](https://nodejs.org/) 16+
- npm 或 yarn
- AI API Key（支持 OpenAI / DeepSeek / 任意兼容接口）

### 安装运行

```bash
# 克隆仓库
git clone https://github.com/SherlockYzz/anime-desktop-pet.git
cd desktop-pet

# 安装依赖
npm install

# 启动
npm start
```

### 配置 AI

1. 点击标题栏的 ⚙ 按钮打开设置
2. 输入 API 地址和 Key
3. 选择模型
4. 点击保存，开始聊天！

### 基础操作

| 操作 | 说明 |
|------|------|
| 拖拽标题栏 | 移动窗口 |
| 点击 👤 | 切换角色 |
| 单击角色 | 随机回应 |
| 连续点击 | 触发吐槽/小情绪 |
| `Ctrl+Shift+P` | 显示/隐藏窗口 |

> 长时间无操作时，角色会主动找你聊天哦！部分角色还有生日彩蛋~

## 角色定制

所有角色的台词、人设、主题色均可自由编辑：

```
角色-加藤惠/
├── 角色设定.js        # 主题色、Live2D 配置
├── 系统提示词.txt      # AI 人设（可直接编辑）
├── 图片素材/           # 头像和封面
└── 台词/              # 各场景台词（每行一句）
    ├── 开机.txt
    ├── 待机.txt
    ├── 点击.txt
    └── 吐槽.txt ...
```

想加新角色？复制角色文件夹，修改 `角色设定.js` 和台词即可！

## 技术栈

- **框架**: Electron 28
- **渲染**: HTML5 + CSS3 + JavaScript
- **2D 引擎**: Live2D Cubism (CubismSdkForWeb)
- **3D 模型**: VRM (Three.js)
- **AI 接口**: OpenAI 兼容 API
- **构建**: electron-builder

## 路线图

- [x] 基础桌宠框架
- [x] 多角色切换
- [x] AI 聊天
- [x] VRM 3D 模型支持
- [x] 代码辅助
- [ ] 所有角色的专属 Live2D 动态资源（制作中）
- [ ] 角色语音大模型合成/ 声库
- [ ] 更多角色（初音未来、时崎狂三...）
- [ ] 桌宠小游戏（戳泡泡、养成等）
- [ ] 插件系统
- [ ] Mac/Linux 优化

## 贡献

欢迎提交 Issue 和 PR！一起让桌宠更可爱 ✨

## 许可证

[MIT](LICENSE)

---

<div align="center">
  <p>
    <a href="https://github.com/SherlockYzz/anime-desktop-pet">⭐ Star 支持</a>
    ·
    <a href="https://github.com/SherlockYzz/anime-desktop-pet/issues">🐛 反馈问题</a>
    ·
    <a href="https://github.com/SherlockYzz/anime-desktop-pet/discussions">💬 讨论交流</a>
  </p>
  <p>Made with ❤️ by 二次元爱好者</p>
</div>
