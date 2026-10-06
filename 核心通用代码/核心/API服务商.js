// 二次元桌宠 - API提供商注册表
const API_PROVIDERS = {

  deepseek: {
    id: 'deepseek',
    name: '🌟 DeepSeek (官方直连)',
    baseUrl: 'https://api.deepseek.com',
    models: [
      { id: 'deepseek-chat', name: 'DeepSeek Chat (V3 推荐)' },
      { id: 'deepseek-reasoner', name: 'DeepSeek Reasoner (R1 深度思考)' },
    ],
    needsKey: true,
    description: 'DeepSeek 官方平台，性价比极高，具备顶尖推理能力。需要 DeepSeek API Key (platform.deepseek.com)',
  },

  siliconflow: {
    id: 'siliconflow',
    name: '🌟 硅基流动 (SiliconFlow)',
    baseUrl: 'https://api.siliconflow.cn/v1',
    models: [
      { id: 'deepseek-ai/DeepSeek-V3', name: 'DeepSeek V3 (强力推荐)' },
      { id: 'deepseek-ai/DeepSeek-R1', name: 'DeepSeek R1 (深度思考)' },
      { id: 'Qwen/Qwen2.5-7B-Instruct', name: '通义千问 2.5 7B (极速免费)' },
      { id: 'Qwen/Qwen2.5-14B-Instruct', name: '通义千问 2.5 14B' },
      { id: 'Qwen/Qwen2.5-32B-Instruct', name: '通义千问 2.5 32B' },
      { id: 'THUDM/glm-4-9b-chat', name: 'GLM-4 9B (免费极速)' },
    ],
    needsKey: true,
    description: '国内高并发聚合大模型平台，注册即送额度，支持大量免费与低价开源模型 (cloud.siliconflow.cn)',
  },

  dashscope: {
    id: 'dashscope',
    name: '🌟 阿里通义千问 (百炼 DashScope)',
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    models: [
      { id: 'qwen-plus', name: '通义千问 Plus (极速推荐)' },
      { id: 'qwen-turbo', name: '通义千问 Turbo (极低成本)' },
      { id: 'qwen-max', name: '通义千问 Max (旗舰高智商)' },
      { id: 'deepseek-v3', name: 'DeepSeek V3 (百炼直连)' },
      { id: 'deepseek-r1', name: 'DeepSeek R1 (百炼深度推理)' },
    ],
    needsKey: true,
    description: '阿里云官方百炼大模型平台，免翻墙国内直连极低延迟，新用户免费赠送海量额度 (bailian.console.aliyun.com)',
  },

  openai: {
    id: 'openai',
    name: 'OpenAI (ChatGPT)',
    baseUrl: 'https://api.openai.com/v1',
    models: [
      { id: 'gpt-4o-mini', name: 'GPT-4o mini (快速轻量推荐)' },
      { id: 'gpt-4o', name: 'GPT-4o (全能旗舰)' },
      { id: 'chatgpt-4o-latest', name: 'ChatGPT-4o Latest' },
      { id: 'o3-mini', name: 'o3-mini (轻量推理)' },
      { id: 'gpt-4.1-mini', name: 'GPT-4.1 mini' },
      { id: 'gpt-4.1', name: 'GPT-4.1' },
    ],
    needsKey: true,
    description: 'OpenAI 官方 API (platform.openai.com)。国内直连若受阻，可直接将下方 API 地址修改为中转代理或反代服务',
  },

  gemini: {
    id: 'gemini',
    name: 'Google Gemini',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
    models: [
      { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash (超低延迟秒回推荐)' },
      { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro (深度推理)' },
      { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash' },
    ],
    needsKey: true,
    description: 'Google 官方大模型，超低延迟极速流式生成，免费配额充足 (aistudio.google.com)',
  },

  zhipu: {
    id: 'zhipu',
    name: '智谱 AI (GLM)',
    baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
    models: [
      { id: 'glm-4-flash', name: 'GLM-4 Flash (永久免费极速)' },
      { id: 'glm-4-plus', name: 'GLM-4 Plus (旗舰高智商)' },
      { id: 'glm-4-air', name: 'GLM-4 Air (高性价比)' },
    ],
    needsKey: true,
    description: '智谱 AI 大模型平台，GLM-4 Flash 永久免费开放调用 (open.bigmodel.cn)',
  },

  doubao: {
    id: 'doubao',
    name: '豆包 (火山引擎)',
    baseUrl: 'https://ark.cn-beijing.volces.com/api/v3',
    models: [
      { id: 'doubao-pro-32k', name: '豆包 Pro 32K' },
      { id: 'doubao-lite-32k', name: '豆包 Lite 32K' },
      { id: 'doubao-pro-128k', name: '豆包 Pro 128K' },
    ],
    needsKey: true,
    description: '字节跳动豆包大模型，需在火山引擎创建接入点，将 Endpoint ID 填入模型名 (volcengine.com)',
  },

  moonshot: {
    id: 'moonshot',
    name: '月之暗面 (Kimi)',
    baseUrl: 'https://api.moonshot.cn/v1',
    models: [
      { id: 'moonshot-v1-8k', name: 'Moonshot v1 8K' },
      { id: 'moonshot-v1-32k', name: 'Moonshot v1 32K' },
    ],
    needsKey: true,
    description: 'Moonshot AI，超强长文本与逻辑能力 (platform.moonshot.cn)',
  },

  mimo: {
    id: 'mimo',
    name: '小米 Mimo',
    baseUrl: 'https://api.xiaomi.com/v1',
    models: [
      { id: 'mimo-v2.5-pro', name: 'Mimo v2.5 Pro' },
      { id: 'mimo-v2.5-flash', name: 'Mimo v2.5 Flash' },
    ],
    needsKey: true,
    description: '小米 Mimo 大模型，需要小米 AI 开放平台 API Key (ai.xiaomi.com)',
  },

  local: {
    id: 'local',
    name: '💻 本地模型 (Ollama)',
    baseUrl: 'http://127.0.0.1:11434/v1',
    models: [
      { id: 'qwen3:8b', name: '千问3 8B (本地推荐)' },
      { id: 'qwen3:4b', name: '千问3 4B (轻量快速)' },
      { id: 'qwen3:14b', name: '千问3 14B (高质量)' },
      { id: 'qwen2.5:7b', name: '千问2.5 7B' },
      { id: 'deepseek-r1:8b', name: 'DeepSeek R1 8B' },
      { id: 'deepseek-r1:14b', name: 'DeepSeek R1 14B' },
      { id: 'llama3.1:8b', name: 'Llama 3.1 8B' },
      { id: 'glm4:9b', name: 'GLM-4 9B' },
    ],
    needsKey: false,
    isLocal: true,
    description: '本地 Ollama 模型，无需 API Key。支持一键检测/启动后台服务，点击下方【🔄 刷新已装模型】即可自动载入本机真实模型。',
  },

  lmstudio: {
    id: 'lmstudio',
    name: '💻 本地模型 (LM Studio)',
    baseUrl: 'http://127.0.0.1:1234/v1',
    models: [
      { id: 'local-model', name: '本地当前加载模型' },
    ],
    needsKey: false,
    isLocal: true,
    description: 'LM Studio 本地服务，需在 LM Studio 的 Local Server 页面点击 Start Server 开启（默认端口 1234）。',
  },

  custom: {
    id: 'custom',
    name: '⚙️ 自定义 (OpenAI 兼容)',
    baseUrl: '',
    models: [],
    needsKey: true,
    description: '任何兼容 OpenAI API 格式的服务（如 OneAPI、NewAPI、个人服务器反代等），支持手动指定地址与模型名。',
  },
};

// 获取提供商列表（用于下拉框）
function getProviderList() {
  return Object.values(API_PROVIDERS).map(p => ({
    id: p.id,
    name: p.name,
    description: p.description,
    isLocal: Boolean(p.isLocal),
  }));
}

// 获取提供商的模型列表
function getProviderModels(providerId) {
  return API_PROVIDERS[providerId]?.models || [];
}

// 获取提供商信息
function getProvider(providerId) {
  return API_PROVIDERS[providerId] || null;
}

// 动态拉取远程或本地的模型列表
async function fetchRemoteModels(providerId, baseUrl, apiKey) {
  const url = (baseUrl || '').replace(/\/+$/, '');
  if (!url) return [];

  // 1. Ollama 原生接口探测
  if (providerId === 'local' || url.includes('11434')) {
    const rawRoot = url.replace(/\/v1\/?$/, '');
    try {
      const res = await fetch(`${rawRoot}/api/tags`, { method: 'GET' });
      if (res.ok) {
        const data = await res.json();
        if (data.models && Array.isArray(data.models) && data.models.length > 0) {
          return data.models.map(m => ({
            id: m.model || m.name,
            name: `${m.name}${m.details?.parameter_size ? ` (${m.details.parameter_size})` : ''}`,
          }));
        }
      }
    } catch (e) {
      // 忽略，尝试通用 /models 接口
    }
  }

  // 2. 通用 OpenAI /v1/models 接口
  try {
    const headers = {};
    if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;
    const targetUrl = url.endsWith('/models') ? url : `${url}/models`;
    const res = await fetch(targetUrl, { method: 'GET', headers });
    if (res.ok) {
      const data = await res.json();
      const list = data.data || data.models;
      if (Array.isArray(list) && list.length > 0) {
        return list.map(m => ({
          id: m.id || m.name,
          name: m.id || m.name,
        }));
      }
    }
  } catch (e) {
    console.warn('[API服务商] 获取模型列表失败:', e.message);
  }

  return [];
}

window.API_PROVIDERS = API_PROVIDERS;
window.getProviderList = getProviderList;
window.getProviderModels = getProviderModels;
window.getProvider = getProvider;
window.fetchRemoteModels = fetchRemoteModels;

