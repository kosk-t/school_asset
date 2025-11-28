"""
Pydanticスキーマ定義
"""
from typing import Optional
from pydantic import BaseModel


class HealthResponse(BaseModel):
    """ヘルスチェックレスポンス"""
    status: str
    timestamp: str
    has_api_key: bool


class UploadResponse(BaseModel):
    """アップロードレスポンス"""
    success: bool
    session_id: str
    image_url: str
    response: str


class ChatRequest(BaseModel):
    """チャットリクエスト"""
    session_id: str
    message: str
    user_id: Optional[str] = None


class ChatResponse(BaseModel):
    """チャットレスポンス"""
    success: bool
    response: str


class MistakeRecord(BaseModel):
    """間違い記録リクエスト"""
    user_id: str
    category: str
    description: Optional[str] = None
    problem: Optional[str] = None


class MistakeResponse(BaseModel):
    """間違い記録レスポンス"""
    success: bool
    mistake_id: int
    category: str
    timestamp: str


class MessageItem(BaseModel):
    """メッセージアイテム"""
    role: str
    content: str
    timestamp: str


class SessionImageItem(BaseModel):
    """セッション画像アイテム"""
    id: int
    image_url: str
    comment: Optional[str]
    order: int
    created_at: str


class SessionResponse(BaseModel):
    """セッションレスポンス"""
    session_id: str
    user_id: str
    image_url: Optional[str]
    user_comment: Optional[str]
    messages: list[MessageItem]
    images: list[SessionImageItem] = []
    created_at: str


class ContinueUploadResponse(BaseModel):
    """続きアップロードレスポンス"""
    success: bool
    session_id: str
    image_url: str
    image_order: int
    response: str
