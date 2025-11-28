"""
ManabiNote AI Backend Server (FastAPI)
数学の宿題フィードバックシステム
"""
import os
import uuid
import base64
from datetime import datetime
from typing import Optional
from contextlib import asynccontextmanager

from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from dotenv import load_dotenv
import httpx

from database import get_db, init_db
from models import User, Session, Message, Mistake, SessionImage
from schemas import (
    ChatRequest, ChatResponse, MistakeRecord, MistakeResponse,
    UploadResponse, SessionResponse, HealthResponse, ContinueUploadResponse,
    SessionImageItem
)

load_dotenv()

# アップロードディレクトリ
UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

# システムプロンプト
SYSTEM_PROMPT = """あなたは「ミライ先生」という、中学生向けの優しい数学の家庭教師AIです。

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
- 数式は `バッククォート` で囲む

## 重要
- 宿題の「答え合わせ」を頼まれた場合も、まず解き方の確認から入る
- 完全に正解の場合は大いに褒める
- 部分的に正解の場合は、正しい部分を褒めてから間違いを指摘"""


@asynccontextmanager
async def lifespan(app: FastAPI):
    """アプリケーションの起動・終了時の処理"""
    await init_db()
    yield


app = FastAPI(
    title="ManabiNote AI API",
    description="数学宿題フィードバックシステム",
    version="1.0.0",
    lifespan=lifespan
)

# CORS設定
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 静的ファイル
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")


async def call_openrouter_api(
    messages: list[dict],
    image_base64: Optional[str] = None
) -> str:
    """OpenRouter APIを呼び出す"""
    api_key = os.getenv("OPENROUTER_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="OPENROUTER_API_KEY が設定されていません")

    # 最初のユーザーメッセージに画像を含める場合
    formatted_messages = []
    for msg in messages:
        if msg["role"] == "user" and image_base64 and len(formatted_messages) == 1:
            # システムメッセージの次（最初のユーザーメッセージ）に画像を添付
            formatted_messages.append({
                "role": "user",
                "content": [
                    {"type": "image_url", "image_url": {"url": image_base64}},
                    {"type": "text", "text": msg["content"]}
                ]
            })
        else:
            formatted_messages.append(msg)

    async with httpx.AsyncClient(timeout=60.0) as client:
        response = await client.post(
            "https://openrouter.ai/api/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
                "HTTP-Referer": os.getenv("APP_URL", "http://localhost:8000"),
                "X-Title": "ManabiNote AI Tutor"
            },
            json={
                "model": os.getenv("AI_MODEL", "anthropic/claude-sonnet-4"),
                "messages": formatted_messages,
                "max_tokens": 2000,
                "temperature": 0.7
            }
        )

        if response.status_code != 200:
            raise HTTPException(
                status_code=response.status_code,
                detail=f"OpenRouter API error: {response.text}"
            )

        data = response.json()
        return data["choices"][0]["message"]["content"]


async def get_or_create_user(db: AsyncSession, user_id: str) -> User:
    """ユーザーを取得または作成"""
    from sqlalchemy import select
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if not user:
        user = User(id=user_id)
        db.add(user)
        await db.commit()
        await db.refresh(user)

    return user


async def get_user_mistake_summary(db: AsyncSession, user_id: str) -> str:
    """ユーザーの間違い傾向をサマリーとして取得"""
    from sqlalchemy import select, func
    result = await db.execute(
        select(Mistake.category, func.count(Mistake.id).label("count"))
        .where(Mistake.user_id == user_id)
        .group_by(Mistake.category)
    )
    mistakes = result.all()

    if not mistakes:
        return ""

    summary = "\n\n## この生徒の過去の傾向\n"
    for category, count in mistakes:
        summary += f"- {category}: {count}回\n"

    return summary


# ==================== API エンドポイント ====================

@app.get("/api/health", response_model=HealthResponse)
async def health_check():
    """ヘルスチェック"""
    return HealthResponse(
        status="ok",
        timestamp=datetime.now().isoformat(),
        has_api_key=bool(os.getenv("OPENROUTER_API_KEY"))
    )


@app.post("/api/homework/upload", response_model=UploadResponse)
async def upload_homework(
    image: UploadFile = File(...),
    userId: str = Form(default="default_user"),
    comment: str = Form(default=""),
    db: AsyncSession = Depends(get_db)
):
    """宿題画像をアップロードして分析開始"""
    # ファイル保存
    file_ext = os.path.splitext(image.filename)[1] or ".jpg"
    filename = f"{datetime.now().strftime('%Y%m%d_%H%M%S')}_{uuid.uuid4().hex[:8]}{file_ext}"
    file_path = os.path.join(UPLOAD_DIR, filename)

    content = await image.read()
    with open(file_path, "wb") as f:
        f.write(content)

    # Base64エンコード
    content_type = image.content_type or "image/jpeg"
    image_base64 = f"data:{content_type};base64,{base64.b64encode(content).decode()}"

    # ユーザー取得/作成
    user = await get_or_create_user(db, userId)

    # 間違い傾向を取得
    mistake_context = await get_user_mistake_summary(db, userId)

    # セッション作成
    session_id = uuid.uuid4().hex
    session = Session(
        id=session_id,
        user_id=user.id,
        image_url=f"/uploads/{filename}",
        user_comment=comment
    )
    db.add(session)
    await db.commit()

    # 初期プロンプト
    initial_prompt = (
        f"生徒からのコメント: 「{comment}」\n\nこの数学の宿題を見て、生徒の解答を分析してください。"
        if comment else
        "この数学の宿題を見て、生徒の解答を分析してください。どこまで解けているか、どこで間違っているかを確認して、優しくフィードバックしてください。"
    )

    messages = [
        {"role": "system", "content": SYSTEM_PROMPT + mistake_context},
        {"role": "user", "content": initial_prompt}
    ]

    # AI呼び出し
    ai_response = await call_openrouter_api(messages, image_base64)

    # メッセージ保存
    user_message = Message(
        session_id=session_id,
        role="user",
        content=initial_prompt
    )
    assistant_message = Message(
        session_id=session_id,
        role="assistant",
        content=ai_response
    )
    db.add(user_message)
    db.add(assistant_message)
    await db.commit()

    return UploadResponse(
        success=True,
        session_id=session_id,
        image_url=f"/uploads/{filename}",
        response=ai_response
    )


@app.post("/api/homework/chat", response_model=ChatResponse)
async def chat(
    request: ChatRequest,
    db: AsyncSession = Depends(get_db)
):
    """会話を続ける"""
    from sqlalchemy import select
    from sqlalchemy.orm import selectinload

    # セッション取得
    result = await db.execute(
        select(Session)
        .options(selectinload(Session.messages))
        .where(Session.id == request.session_id)
    )
    session = result.scalar_one_or_none()

    if not session:
        raise HTTPException(status_code=404, detail="セッションが見つかりません")

    # 間違い傾向を取得
    user_id = request.user_id or session.user_id
    mistake_context = await get_user_mistake_summary(db, user_id)

    # メッセージ履歴を構築
    messages = [{"role": "system", "content": SYSTEM_PROMPT + mistake_context}]
    for msg in sorted(session.messages, key=lambda m: m.created_at):
        messages.append({"role": msg.role, "content": msg.content})
    messages.append({"role": "user", "content": request.message})

    # AI呼び出し
    ai_response = await call_openrouter_api(messages)

    # メッセージ保存
    user_message = Message(
        session_id=session.id,
        role="user",
        content=request.message
    )
    assistant_message = Message(
        session_id=session.id,
        role="assistant",
        content=ai_response
    )
    db.add(user_message)
    db.add(assistant_message)
    await db.commit()

    return ChatResponse(success=True, response=ai_response)


@app.post("/api/homework/continue", response_model=ContinueUploadResponse)
async def continue_homework(
    image: UploadFile = File(...),
    sessionId: str = Form(...),
    comment: str = Form(default=""),
    db: AsyncSession = Depends(get_db)
):
    """既存セッションに続きの画像をアップロード"""
    from sqlalchemy import select, func
    from sqlalchemy.orm import selectinload

    # セッション取得
    result = await db.execute(
        select(Session)
        .options(selectinload(Session.messages), selectinload(Session.images))
        .where(Session.id == sessionId)
    )
    session = result.scalar_one_or_none()

    if not session:
        raise HTTPException(status_code=404, detail="セッションが見つかりません")

    # ファイル保存
    file_ext = os.path.splitext(image.filename)[1] or ".jpg"
    filename = f"{datetime.now().strftime('%Y%m%d_%H%M%S')}_{uuid.uuid4().hex[:8]}{file_ext}"
    file_path = os.path.join(UPLOAD_DIR, filename)

    content = await image.read()
    with open(file_path, "wb") as f:
        f.write(content)

    # Base64エンコード
    content_type = image.content_type or "image/jpeg"
    image_base64 = f"data:{content_type};base64,{base64.b64encode(content).decode()}"

    # 画像の順序を決定
    image_order = len(session.images) + 1

    # SessionImageを保存
    session_image = SessionImage(
        session_id=session.id,
        image_url=f"/uploads/{filename}",
        comment=comment,
        order=image_order
    )
    db.add(session_image)
    await db.commit()

    # 間違い傾向を取得
    mistake_context = await get_user_mistake_summary(db, session.user_id)

    # メッセージ履歴を構築
    messages = [{"role": "system", "content": SYSTEM_PROMPT + mistake_context}]
    for msg in sorted(session.messages, key=lambda m: m.created_at):
        messages.append({"role": msg.role, "content": msg.content})

    # 続きの画像についてのプロンプト
    continue_prompt = (
        f"生徒が続きを解きました！（{image_order}枚目の画像）\n"
        f"生徒のコメント: 「{comment}」\n\n"
        "前回の会話を踏まえて、この続きの解答を見てください。"
        "進捗を褒めて、必要があれば次のステップをアドバイスしてね。"
    ) if comment else (
        f"生徒が続きを解きました！（{image_order}枚目の画像）\n\n"
        "前回の会話を踏まえて、この続きの解答を見てください。"
        "どこまで進んだか確認して、進捗を褒めてあげてね。"
    )

    messages.append({"role": "user", "content": continue_prompt})

    # AI呼び出し（新しい画像を添付）
    ai_response = await call_openrouter_api(messages, image_base64)

    # メッセージ保存
    user_message = Message(
        session_id=session.id,
        role="user",
        content=continue_prompt
    )
    assistant_message = Message(
        session_id=session.id,
        role="assistant",
        content=ai_response
    )
    db.add(user_message)
    db.add(assistant_message)
    await db.commit()

    return ContinueUploadResponse(
        success=True,
        session_id=session.id,
        image_url=f"/uploads/{filename}",
        image_order=image_order,
        response=ai_response
    )


@app.post("/api/mistakes/record", response_model=MistakeResponse)
async def record_mistake(
    request: MistakeRecord,
    db: AsyncSession = Depends(get_db)
):
    """間違いを記録する"""
    await get_or_create_user(db, request.user_id)

    mistake = Mistake(
        user_id=request.user_id,
        category=request.category,
        description=request.description or "",
        problem=request.problem or ""
    )
    db.add(mistake)
    await db.commit()
    await db.refresh(mistake)

    return MistakeResponse(
        success=True,
        mistake_id=mistake.id,
        category=mistake.category,
        timestamp=mistake.created_at.isoformat()
    )


@app.get("/api/mistakes/{user_id}")
async def get_mistakes(
    user_id: str,
    db: AsyncSession = Depends(get_db)
):
    """ユーザーの間違い履歴を取得"""
    from sqlalchemy import select, func

    # サマリー取得
    result = await db.execute(
        select(
            Mistake.category,
            func.count(Mistake.id).label("count"),
            func.max(Mistake.created_at).label("last_seen")
        )
        .where(Mistake.user_id == user_id)
        .group_by(Mistake.category)
    )
    summary_rows = result.all()

    summary = {}
    for category, count, last_seen in summary_rows:
        summary[category] = {
            "count": count,
            "lastSeen": last_seen.strftime("%Y/%m/%d") if last_seen else ""
        }

    # 詳細取得
    result = await db.execute(
        select(Mistake)
        .where(Mistake.user_id == user_id)
        .order_by(Mistake.created_at.desc())
        .limit(50)
    )
    mistakes = result.scalars().all()

    return {
        "userId": user_id,
        "summary": summary,
        "mistakes": [
            {
                "id": m.id,
                "category": m.category,
                "description": m.description,
                "problem": m.problem,
                "timestamp": m.created_at.isoformat()
            }
            for m in mistakes
        ]
    }


@app.get("/api/session/{session_id}", response_model=SessionResponse)
async def get_session(
    session_id: str,
    db: AsyncSession = Depends(get_db)
):
    """セッション情報を取得"""
    from sqlalchemy import select
    from sqlalchemy.orm import selectinload

    result = await db.execute(
        select(Session)
        .options(selectinload(Session.messages), selectinload(Session.images))
        .where(Session.id == session_id)
    )
    session = result.scalar_one_or_none()

    if not session:
        raise HTTPException(status_code=404, detail="セッションが見つかりません")

    return SessionResponse(
        session_id=session.id,
        user_id=session.user_id,
        image_url=session.image_url,
        user_comment=session.user_comment,
        messages=[
            {"role": m.role, "content": m.content, "timestamp": m.created_at.isoformat()}
            for m in sorted(session.messages, key=lambda m: m.created_at)
        ],
        images=[
            SessionImageItem(
                id=img.id,
                image_url=img.image_url,
                comment=img.comment,
                order=img.order,
                created_at=img.created_at.isoformat()
            )
            for img in sorted(session.images, key=lambda i: i.order)
        ],
        created_at=session.created_at.isoformat()
    )


# フロントエンドのルーティング
@app.get("/")
async def serve_frontend():
    """フロントエンドを提供"""
    frontend_path = os.path.join(os.path.dirname(__file__), "..", "frontend", "index.html")
    if os.path.exists(frontend_path):
        return FileResponse(frontend_path)
    raise HTTPException(status_code=404, detail="Frontend not found")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
