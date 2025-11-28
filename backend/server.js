/**
 * ManabiNote AI Backend Server
 * 数学の宿題フィードバックシステム
 */
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3001;

// ミドルウェア設定
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.static(path.join(__dirname, '../frontend')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ファイルアップロード設定
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${uuidv4()}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('画像ファイルのみアップロードできます'));
    }
  }
});

// ユーザーデータの保存パス
const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// ユーザーの間違い履歴を取得
function getUserMistakes(userId) {
  const filePath = path.join(DATA_DIR, `${userId}_mistakes.json`);
  if (fs.existsSync(filePath)) {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  }
  return { userId, mistakes: [], summary: {} };
}

// ユーザーの間違い履歴を保存
function saveUserMistakes(userId, data) {
  const filePath = path.join(DATA_DIR, `${userId}_mistakes.json`);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

// 会話履歴を取得
function getConversationHistory(sessionId) {
  const filePath = path.join(DATA_DIR, `session_${sessionId}.json`);
  if (fs.existsSync(filePath)) {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  }
  return { sessionId, messages: [], imageUrl: null, userComment: null };
}

// 会話履歴を保存
function saveConversationHistory(sessionId, data) {
  const filePath = path.join(DATA_DIR, `session_${sessionId}.json`);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

// OpenRouter API 呼び出し
async function callOpenRouterAPI(messages, imageUrl = null) {
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY が設定されていません');
  }

  // 画像を含む場合のメッセージ形式に変換
  const formattedMessages = messages.map(msg => {
    if (msg.role === 'user' && msg.imageUrl) {
      return {
        role: 'user',
        content: [
          {
            type: 'image_url',
            image_url: { url: msg.imageUrl }
          },
          {
            type: 'text',
            text: msg.content
          }
        ]
      };
    }
    return msg;
  });

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': process.env.APP_URL || 'http://localhost:3001',
      'X-Title': 'ManabiNote AI Tutor'
    },
    body: JSON.stringify({
      model: process.env.AI_MODEL || 'anthropic/claude-sonnet-4',
      messages: formattedMessages,
      max_tokens: 2000,
      temperature: 0.7
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenRouter API error: ${error}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

// システムプロンプト
const SYSTEM_PROMPT = `あなたは「ミライ先生」という、中学生向けの優しい数学の家庭教師AIです。

## 役割と性格
- 温かくて親しみやすい口調で話す
- 生徒のがんばりを認め、褒めることを大切にする
- 間違いを責めるのではなく、一緒に考える姿勢
- 「すごいね！」「がんばってるね！」など励ましの言葉を使う

## 指導方針
1. **答えを直接教えない**: ヒントを段階的に与え、生徒自身が答えにたどり着けるようサポート
2. **良い点を先に褒める**: 途中式や考え方で正しい部分があれば、まずそれを褒める
3. **間違いの原因を優しく説明**: なぜ間違ったのか、わかりやすく説明
4. **次のステップを提示**: 「次はこうしてみよう」と具体的なアドバイス

## 画像解析時の注意
- 黒字: 生徒が自分で書いた解答
- 赤字: 修正した部分（答えを見た or AIに教えてもらった）
- 赤字が多い場合は、その部分の理解が浅い可能性あり

## 回答フォーマット
回答は以下の構造で提供してください：
- 短い文で区切る
- 絵文字を適度に使って親しみやすく
- 数式は \`バッククォート\` で囲む

## 重要
- 宿題の「答え合わせ」を頼まれた場合も、まず解き方の確認から入る
- 完全に正解の場合は大いに褒める
- 部分的に正解の場合は、正しい部分を褒めてから間違いを指摘`;

// API Routes

/**
 * 宿題画像をアップロードして分析開始
 * POST /api/homework/upload
 */
app.post('/api/homework/upload', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '画像ファイルが必要です' });
    }

    const userId = req.body.userId || 'default_user';
    const userComment = req.body.comment || '';
    const sessionId = uuidv4();

    // 画像URLを生成
    const imageUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;

    // Base64エンコード（OpenRouterに送る用）
    const imageBuffer = fs.readFileSync(req.file.path);
    const base64Image = `data:${req.file.mimetype};base64,${imageBuffer.toString('base64')}`;

    // ユーザーの間違い履歴を取得
    const userMistakes = getUserMistakes(userId);

    // 過去の間違いパターンをプロンプトに含める
    let mistakeContext = '';
    if (userMistakes.summary && Object.keys(userMistakes.summary).length > 0) {
      mistakeContext = `\n\n## この生徒の過去の傾向\n`;
      for (const [category, info] of Object.entries(userMistakes.summary)) {
        mistakeContext += `- ${category}: ${info.count}回（${info.lastSeen}）\n`;
      }
    }

    // 初期メッセージを構築
    const initialPrompt = userComment
      ? `生徒からのコメント: 「${userComment}」\n\nこの数学の宿題を見て、生徒の解答を分析してください。`
      : `この数学の宿題を見て、生徒の解答を分析してください。どこまで解けているか、どこで間違っているかを確認して、優しくフィードバックしてください。`;

    const messages = [
      { role: 'system', content: SYSTEM_PROMPT + mistakeContext },
      { role: 'user', content: initialPrompt, imageUrl: base64Image }
    ];

    // AIに分析を依頼
    const aiResponse = await callOpenRouterAPI(messages);

    // セッション情報を保存
    const sessionData = {
      sessionId,
      userId,
      imageUrl,
      userComment,
      messages: [
        { role: 'user', content: initialPrompt, timestamp: new Date().toISOString() },
        { role: 'assistant', content: aiResponse, timestamp: new Date().toISOString() }
      ],
      createdAt: new Date().toISOString()
    };
    saveConversationHistory(sessionId, sessionData);

    res.json({
      success: true,
      sessionId,
      imageUrl,
      response: aiResponse
    });

  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * 会話を続ける
 * POST /api/homework/chat
 */
app.post('/api/homework/chat', async (req, res) => {
  try {
    const { sessionId, message, userId } = req.body;

    if (!sessionId || !message) {
      return res.status(400).json({ error: 'sessionId と message が必要です' });
    }

    // セッション情報を取得
    const session = getConversationHistory(sessionId);
    if (!session.sessionId) {
      return res.status(404).json({ error: 'セッションが見つかりません' });
    }

    // ユーザーの間違い履歴を取得
    const userMistakes = getUserMistakes(userId || session.userId || 'default_user');

    let mistakeContext = '';
    if (userMistakes.summary && Object.keys(userMistakes.summary).length > 0) {
      mistakeContext = `\n\n## この生徒の過去の傾向\n`;
      for (const [category, info] of Object.entries(userMistakes.summary)) {
        mistakeContext += `- ${category}: ${info.count}回（${info.lastSeen}）\n`;
      }
    }

    // メッセージ履歴を構築
    const messages = [
      { role: 'system', content: SYSTEM_PROMPT + mistakeContext },
      ...session.messages.map(m => ({ role: m.role, content: m.content })),
      { role: 'user', content: message }
    ];

    // AIに送信
    const aiResponse = await callOpenRouterAPI(messages);

    // セッションを更新
    session.messages.push(
      { role: 'user', content: message, timestamp: new Date().toISOString() },
      { role: 'assistant', content: aiResponse, timestamp: new Date().toISOString() }
    );
    saveConversationHistory(sessionId, session);

    res.json({
      success: true,
      response: aiResponse
    });

  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * 間違いを記録する
 * POST /api/mistakes/record
 */
app.post('/api/mistakes/record', (req, res) => {
  try {
    const { userId, category, description, problem } = req.body;

    if (!userId || !category) {
      return res.status(400).json({ error: 'userId と category が必要です' });
    }

    const userMistakes = getUserMistakes(userId);

    // 間違い履歴に追加
    const mistake = {
      id: uuidv4(),
      category,
      description: description || '',
      problem: problem || '',
      timestamp: new Date().toISOString()
    };
    userMistakes.mistakes.push(mistake);

    // サマリーを更新
    if (!userMistakes.summary[category]) {
      userMistakes.summary[category] = { count: 0, lastSeen: '' };
    }
    userMistakes.summary[category].count++;
    userMistakes.summary[category].lastSeen = new Date().toLocaleDateString('ja-JP');

    saveUserMistakes(userId, userMistakes);

    res.json({ success: true, mistake });

  } catch (error) {
    console.error('Record mistake error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * ユーザーの間違い履歴を取得
 * GET /api/mistakes/:userId
 */
app.get('/api/mistakes/:userId', (req, res) => {
  try {
    const { userId } = req.params;
    const userMistakes = getUserMistakes(userId);
    res.json(userMistakes);
  } catch (error) {
    console.error('Get mistakes error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * セッション情報を取得
 * GET /api/session/:sessionId
 */
app.get('/api/session/:sessionId', (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = getConversationHistory(sessionId);
    if (!session.sessionId) {
      return res.status(404).json({ error: 'セッションが見つかりません' });
    }
    res.json(session);
  } catch (error) {
    console.error('Get session error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * ヘルスチェック
 * GET /api/health
 */
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    hasApiKey: !!process.env.OPENROUTER_API_KEY
  });
});

// フロントエンドのルーティング
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// サーバー起動
app.listen(PORT, () => {
  console.log(`🎓 ManabiNote AI Server running on http://localhost:${PORT}`);
  console.log(`📝 API Key configured: ${process.env.OPENROUTER_API_KEY ? 'Yes' : 'No - Please set OPENROUTER_API_KEY'}`);
});
