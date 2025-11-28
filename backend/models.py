"""
データベースモデル定義
"""
from datetime import datetime
from sqlalchemy import Column, String, Text, DateTime, ForeignKey, Integer
from sqlalchemy.orm import relationship
from database import Base


class User(Base):
    """ユーザーモデル"""
    __tablename__ = "users"

    id = Column(String(50), primary_key=True)
    name = Column(String(100), default="ゲスト")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # リレーション
    sessions = relationship("Session", back_populates="user", cascade="all, delete-orphan")
    mistakes = relationship("Mistake", back_populates="user", cascade="all, delete-orphan")


class Session(Base):
    """セッションモデル（1回の宿題チェック）"""
    __tablename__ = "sessions"

    id = Column(String(50), primary_key=True)
    user_id = Column(String(50), ForeignKey("users.id"), nullable=False)
    image_url = Column(String(500))
    user_comment = Column(Text, default="")
    created_at = Column(DateTime, default=datetime.utcnow)

    # リレーション
    user = relationship("User", back_populates="sessions")
    messages = relationship("Message", back_populates="session", cascade="all, delete-orphan")


class Message(Base):
    """メッセージモデル（チャット履歴）"""
    __tablename__ = "messages"

    id = Column(Integer, primary_key=True, autoincrement=True)
    session_id = Column(String(50), ForeignKey("sessions.id"), nullable=False)
    role = Column(String(20), nullable=False)  # "user" or "assistant"
    content = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    # リレーション
    session = relationship("Session", back_populates="messages")


class Mistake(Base):
    """間違いモデル（苦手分野の記録）"""
    __tablename__ = "mistakes"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String(50), ForeignKey("users.id"), nullable=False)
    category = Column(String(100), nullable=False)  # 例: "移項", "符号", "分数計算"
    description = Column(Text, default="")
    problem = Column(Text, default="")  # 問題文
    created_at = Column(DateTime, default=datetime.utcnow)

    # リレーション
    user = relationship("User", back_populates="mistakes")
