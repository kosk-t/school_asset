"""
データベース接続設定
"""
import os
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase

# データベースファイルのパス
DB_DIR = os.path.join(os.path.dirname(__file__), "data")
os.makedirs(DB_DIR, exist_ok=True)
DATABASE_URL = f"sqlite+aiosqlite:///{os.path.join(DB_DIR, 'manabi.db')}"

# エンジン作成
engine = create_async_engine(
    DATABASE_URL,
    echo=False,  # SQLログを出力する場合はTrue
)

# セッションファクトリ
async_session = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False
)


class Base(DeclarativeBase):
    """ベースモデル"""
    pass


async def init_db():
    """データベースの初期化（テーブル作成）"""
    async with engine.begin() as conn:
        # モデルをインポートしてテーブル作成
        from models import User, Session, Message, Mistake
        await conn.run_sync(Base.metadata.create_all)


async def get_db():
    """データベースセッションを取得"""
    async with async_session() as session:
        try:
            yield session
        finally:
            await session.close()
