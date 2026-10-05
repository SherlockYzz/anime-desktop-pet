// 二次元桌宠 - API提供商注册表
const API_PROVIDERS = {

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
    description: '字节跳动豆包大模型，需要火山引擎API Key',
  },

  deepseek: {
    id: 'deepseek',
    name: 'DeepSeek',
    baseUrl: 'https://api.deepseek.com/v1',
    models: [
      { id: 'deepseek-chat', name: 'DeepSeek Chat' },
      { id: 'deepseek-coder', name: 'DeepSeek Coder' },
      { id: 'deepseek-reasoner', name: 'DeepSeek Reasoner' },
    ],
    needsKey: true,
    description: 'DeepSeek大模型，需要DeepSeek API Key (platform.deepseek.com)',
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
    description: '小米Mimo大模型，需要小米AI开放平台API Key (ai.xiaomi.com)',
  },

  siliconflow: {
    id: 'siliconflow',
    name: '硅基流动 (SiliconFlow)',
    baseUrl: 'https://api.siliconflow.cn/v1',
    models: [
      { id: 'deepseek-ai/DeepSeek-V3', name: 'DeepSeek V3 (强力推荐)' },
      { id: 'deepseek-ai/DeepSeek-R1', name: 'DeepSeek R1 (深度思考)' },
      { id: 'Qwen/Qwen2.5-7B-Instruct', name: '通义千问 2.5 7B (极速免费)' },
      { id: 'Qwen/Qwen2.5-14B-Instruct', name: '通义千问 2.5 14B' },
      { id: 'Qwen/Qwen2.5-32B-Instruct', name: '通义千问 2.5 32B' },
    ],
    needsKey: true,
    description: '国内高并发聚合大模型平台，支持大量免费与低价开源模型 (cloud.siliconflow.cn)',
  },

  gemini: {
    id: 'gemini',
    name: 'Google Gemini',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
    models: [
      { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash (超低延迟推荐)' },
      { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro (深度推理)' },
      { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash' },
    ],
    needsKey: true,
    description: 'Google 官方大模型，超低延迟极速流式生成，非常适合桌宠实时互动 (aistudio.google.com)',
  },

  openai: {
    id: 'openai',
    name: 'OpenAI (ChatGPT)',
    baseUrl: 'https://api.openai.com/v1',
    models: [
      { id: 'gpt-4o-mini', name: 'GPT-4o mini (快速轻量)' },
      { id: 'gpt-4o', name: 'GPT-4o (全能旗舰)' },
      { id: 'chatgpt-4o-latest', name: 'ChatGPT-4o Latest' },
    ],
    needsKey: true,
    description: 'OpenAI 官方 API，需要 OpenAI API Key (platform.openai.com)',
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

  zhipu: {
    id: 'zhipu',
    name: '智谱 AI (GLM)',
    baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
    models: [
      { id: 'glm-4-flash', name: 'GLM-4 Flash (免费极速)' },
      { id: 'glm-4-plus', name: 'GLM-4 Plus' },
    ],
    needsKey: true,
    description: '智谱 AI 大模型平台，提供高性价比与免费极速模型 (open.bigmodel.cn)',
  },

  local: {
    id: 'local',
    name: '本地模型 (Ollama)',
    baseUrl: 'http://localhost:11434/v1',
    models: [
      { id: 'qwen3:8b', name: '千问3 8B (推荐)' },
      { id: 'qwen3:4b', name: '千问3 4B (轻量)' },
      { id: 'qwen3:14b', name: '千问3 14B (高质量)' },
      { id: 'qwen3:30b-a3b', name: '千问3 30B MoE (顶级)' },
      { id: 'qwen2.5:7b', name: '千问2.5 7B' },
      { id: 'deepseek-r1:8b', name: 'DeepSeek R1 8B' },
      { id: 'deepseek-r1:14b', name: 'DeepSeek R1 14B' },
      { id: 'llama3.1:8b', name: 'Llama 3.1 8B' },
      { id: 'glm4:9b', name: 'GLM-4 9B' },
    ],
    needsKey: false,
    description: '本地Ollama模型，无需API Key。需先安装Ollama (ollama.com) 并用 ollama pull 下载模型。推荐千问3 8B，4GB显存可跑。',
  },

  custom: {
    id: 'custom',
    name: '自定义 (OpenAI兼容)',
    baseUrl: '',
    models: [],
    needsKey: true,
    description: '任何兼容OpenAI API格式的服务，手动填写地址和模型名',
  },
};

// 获取提供商列表（用于下拉框）
function getProviderList() {
  return Object.values(API_PROVIDERS).map(p => ({
    id: p.id,
    name: p.name,
    description: p.description,
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

window.API_PROVIDERS = API_PROVIDERS;
window.getProviderList = getProviderList;
window.getProviderModels = getProviderModels;
window.getProvider = getProvider;
