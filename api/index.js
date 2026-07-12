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

// ===== AI 对话接口 (DeepSeek) =====
app.post('/api/chat', async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) {
      return res.status(400).json({ error: '请提供 message 字段' });
    }

    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: '未配置 DEEPSEEK_API_KEY 环境变量' });
    }

    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
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
