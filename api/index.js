import express from 'express';
import cors from 'cors';

const app = express();

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.json({ message: '后端 API 运行中 🚀' });
});

app.get('/api/health', (req, res) => {
  res.json({
    code: 200,
    message: '服务正常',
    timestamp: new Date().toISOString()
  });
});

// ===== 获取可用模型列表 =====
app.post('/api/models', async (req, res) => {
  try {
    const { apiUrl, apiKey } = req.body;

    // 从 chat completions URL 推导 models 接口地址
    const resolvedUrl = apiUrl || 'https://api.deepseek.com/v1/chat/completions';
    const resolvedKey = apiKey || process.env.DEEPSEEK_API_KEY;

    if (!resolvedKey) {
      return res.status(400).json({ error: '请先填写 API Key' });
    }

    // 把 /chat/completions 替换为 /models，如果 URL 不以 /chat/completions 结尾则用 base path
    const baseUrl = resolvedUrl.replace(/\/chat\/completions\/?$/, '');
    const modelsUrl = baseUrl + '/models';

    const response = await fetch(modelsUrl, {
      headers: { 'Authorization': `Bearer ${resolvedKey}` },
    });

    if (!response.ok) {
      const text = await response.text();
      return res.status(response.status).json({ error: `获取模型列表失败: ${response.status} ${text.slice(0, 200)}` });
    }

    const data = await response.json();

    // OpenAI 返回 { data: [{ id: "gpt-4o", ... }, ...] }
    const models = (data.data || [])
      .map(m => m.id)
      .filter(id => !id.startsWith('ft:') && !id.includes('embedding') && !id.includes('dall-e') && !id.includes('whisper') && !id.includes('tts') && !id.includes('moderation'))
      .sort();

    res.json({ models });
  } catch (err) {
    console.error('models error:', err);
    res.status(500).json({ error: '无法获取模型列表' });
  }
});

// ===== AI 对话接口 =====
// 支持自定义 API（OpenAI 兼容格式），未设置时默认使用 DeepSeek
app.post('/api/chat', async (req, res) => {
  try {
    const { message, apiUrl, apiKey, model } = req.body;
    if (!message) {
      return res.status(400).json({ error: '请提供 message 字段' });
    }

    // 优先使用前端传来的自定义配置，否则回退到服务端 DeepSeek 默认值
    const resolvedUrl  = apiUrl  || 'https://api.deepseek.com/v1/chat/completions';
    const resolvedKey  = apiKey  || process.env.DEEPSEEK_API_KEY;
    const resolvedModel = model  || 'deepseek-chat';

    if (!resolvedKey) {
      return res.status(500).json({ error: '未配置 API Key，请在设置中填写或设置 DEEPSEEK_API_KEY 环境变量' });
    }

    const response = await fetch(resolvedUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${resolvedKey}`
      },
      body: JSON.stringify({
        model: resolvedModel,
        max_tokens: 1024,
        messages: [{ role: 'user', content: message }]
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({ error: data.error?.message || 'AI API 调用失败' });
    }

    const reply = data.choices?.[0]?.message?.content || '（AI 未返回内容）';

    res.json({ reply });
  } catch (err) {
    console.error('chat error:', err);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

export default app;
