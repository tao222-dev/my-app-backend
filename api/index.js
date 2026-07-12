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

export default app;
