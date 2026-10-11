// AI Desktop Pet - API Providers Registry
const API_PROVIDERS = {

  openai: {
    id: 'openai',
    name: '🌟 OpenAI (ChatGPT)',
    baseUrl: 'https://api.openai.com/v1',
    models: [
      { id: 'gpt-4o-mini', name: 'GPT-4o mini (Fast & Lightweight Recommended)' },
      { id: 'gpt-4o', name: 'GPT-4o (Flagship Omni)' },
      { id: 'chatgpt-4o-latest', name: 'ChatGPT-4o Latest' },
      { id: 'o3-mini', name: 'o3-mini (Reasoning Model)' },
      { id: 'gpt-4.1-mini', name: 'GPT-4.1 mini' },
      { id: 'gpt-4.1', name: 'GPT-4.1' },
    ],
    needsKey: true,
    description: 'Official OpenAI API (platform.openai.com). High intelligence and multi-turn conversational quality.',
  },

  gemini: {
    id: 'gemini',
    name: '🌟 Google Gemini',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
    models: [
      { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash (Ultra-low Latency Recommended)' },
      { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro (Deep Reasoning)' },
      { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash' },
    ],
    needsKey: true,
    description: 'Official Google Gemini API (aistudio.google.com). High rate limits, instant streaming generation.',
  },

  deepseek: {
    id: 'deepseek',
    name: '🌟 DeepSeek (Official)',
    baseUrl: 'https://api.deepseek.com',
    models: [
      { id: 'deepseek-chat', name: 'DeepSeek Chat (V3 Recommended)' },
      { id: 'deepseek-reasoner', name: 'DeepSeek Reasoner (R1 Deep Thinking)' },
    ],
    needsKey: true,
    description: 'Official DeepSeek API (platform.deepseek.com), top-tier reasoning and cost performance.',
  },

  siliconflow: {
    id: 'siliconflow',
    name: 'SiliconFlow',
    baseUrl: 'https://api.siliconflow.cn/v1',
    models: [
      { id: 'deepseek-ai/DeepSeek-V3', name: 'DeepSeek V3' },
      { id: 'deepseek-ai/DeepSeek-R1', name: 'DeepSeek R1' },
      { id: 'Qwen/Qwen2.5-7B-Instruct', name: 'Qwen 2.5 7B' },
      { id: 'Qwen/Qwen2.5-14B-Instruct', name: 'Qwen 2.5 14B' },
      { id: 'Qwen/Qwen2.5-32B-Instruct', name: 'Qwen 2.5 32B' },
      { id: 'THUDM/glm-4-9b-chat', name: 'GLM-4 9B' },
    ],
    needsKey: true,
    description: 'High-concurrency model aggregation platform (cloud.siliconflow.cn) with various open-source models.',
  },

  dashscope: {
    id: 'dashscope',
    name: 'Alibaba Qwen (DashScope)',
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    models: [
      { id: 'qwen-plus', name: 'Qwen Plus' },
      { id: 'qwen-turbo', name: 'Qwen Turbo' },
      { id: 'qwen-max', name: 'Qwen Max' },
      { id: 'deepseek-v3', name: 'DeepSeek V3' },
      { id: 'deepseek-r1', name: 'DeepSeek R1' },
    ],
    needsKey: true,
    description: 'Alibaba Cloud DashScope platform (bailian.console.aliyun.com). Fast and reliable.',
  },

  local: {
    id: 'local',
    name: '💻 Local Model (Ollama)',
    baseUrl: 'http://127.0.0.1:11434/v1',
    models: [
      { id: 'qwen3:8b', name: 'Qwen 3 8B (Local Recommended)' },
      { id: 'qwen3:4b', name: 'Qwen 3 4B (Fast)' },
      { id: 'qwen3:14b', name: 'Qwen 3 14B (High Quality)' },
      { id: 'qwen2.5:7b', name: 'Qwen 2.5 7B' },
      { id: 'deepseek-r1:8b', name: 'DeepSeek R1 8B' },
      { id: 'deepseek-r1:14b', name: 'DeepSeek R1 14B' },
      { id: 'llama3.1:8b', name: 'Llama 3.1 8B' },
      { id: 'glm4:9b', name: 'GLM-4 9B' },
    ],
    needsKey: false,
    isLocal: true,
    description: 'Local Ollama service, 100% private and offline, no API Key needed. Click Refresh to scan downloaded models.',
  },

  lmstudio: {
    id: 'lmstudio',
    name: '💻 Local Model (LM Studio)',
    baseUrl: 'http://127.0.0.1:1234/v1',
    models: [
      { id: 'local-model', name: 'Active LM Studio Model' },
    ],
    needsKey: false,
    isLocal: true,
    description: 'LM Studio local server. Start server on the Local Server tab (port 1234 by default).',
  },

  custom: {
    id: 'custom',
    name: '⚙️ Custom (OpenAI Compatible)',
    baseUrl: '',
    models: [],
    needsKey: true,
    description: 'Any OpenAI-compatible endpoint (OneAPI, NewAPI, vLLM, self-hosted proxy).',
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

