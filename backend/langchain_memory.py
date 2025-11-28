"""
LangChain メモリサービス
セッションごとの会話履歴とサマリーを管理
"""
import os
from typing import Optional
from langchain_openai import ChatOpenAI
from langchain.memory import ConversationSummaryBufferMemory
from langchain.schema import HumanMessage, AIMessage, SystemMessage
from langchain_core.messages import BaseMessage

# OpenRouter経由でChatモデルを作成
def get_chat_model(temperature: float = 0.7) -> ChatOpenAI:
    """OpenRouter経由のChatモデルを取得"""
    return ChatOpenAI(
        model=os.getenv("AI_MODEL", "anthropic/claude-sonnet-4"),
        openai_api_key=os.getenv("OPENROUTER_API_KEY"),
        openai_api_base="https://openrouter.ai/api/v1",
        temperature=temperature,
        max_tokens=2000,
        default_headers={
            "HTTP-Referer": os.getenv("APP_URL", "http://localhost:8000"),
            "X-Title": "ManabiNote AI Tutor"
        }
    )


class SessionMemoryManager:
    """
    セッションごとのメモリを管理するクラス
    - ConversationSummaryBufferMemory: 最近の会話を保持しつつ、古い会話を要約
    - DBからの復元とDBへの保存をサポート
    """

    def __init__(self, max_token_limit: int = 2000):
        self.max_token_limit = max_token_limit
        self._memories: dict[str, ConversationSummaryBufferMemory] = {}
        self._summaries: dict[str, str] = {}  # セッションごとの要約を保持

    def get_memory(self, session_id: str) -> ConversationSummaryBufferMemory:
        """セッションのメモリを取得（なければ作成）"""
        if session_id not in self._memories:
            llm = get_chat_model(temperature=0.3)  # 要約用は低温度
            self._memories[session_id] = ConversationSummaryBufferMemory(
                llm=llm,
                max_token_limit=self.max_token_limit,
                return_messages=True,
                memory_key="history"
            )
        return self._memories[session_id]

    def load_from_db_messages(
        self,
        session_id: str,
        messages: list[dict],
        existing_summary: Optional[str] = None
    ):
        """
        DBから読み込んだメッセージでメモリを初期化
        既存の要約がある場合はそれを使用
        """
        memory = self.get_memory(session_id)

        # 既存の要約があれば設定
        if existing_summary:
            memory.moving_summary_buffer = existing_summary
            self._summaries[session_id] = existing_summary

        # メッセージを追加
        for msg in messages:
            if msg["role"] == "user":
                memory.chat_memory.add_user_message(msg["content"])
            elif msg["role"] == "assistant":
                memory.chat_memory.add_ai_message(msg["content"])

    def add_user_message(self, session_id: str, content: str):
        """ユーザーメッセージを追加"""
        memory = self.get_memory(session_id)
        memory.chat_memory.add_user_message(content)

    def add_ai_message(self, session_id: str, content: str):
        """AIメッセージを追加"""
        memory = self.get_memory(session_id)
        memory.chat_memory.add_ai_message(content)

    def get_messages_for_api(
        self,
        session_id: str,
        system_prompt: str
    ) -> list[dict]:
        """
        API呼び出し用のメッセージリストを取得
        システムプロンプト + 会話履歴（要約含む）
        """
        memory = self.get_memory(session_id)

        messages = [{"role": "system", "content": system_prompt}]

        # 要約がある場合は追加
        if memory.moving_summary_buffer:
            messages.append({
                "role": "system",
                "content": f"これまでの会話の要約:\n{memory.moving_summary_buffer}"
            })

        # 最近のメッセージを追加
        for msg in memory.chat_memory.messages:
            if isinstance(msg, HumanMessage):
                messages.append({"role": "user", "content": msg.content})
            elif isinstance(msg, AIMessage):
                messages.append({"role": "assistant", "content": msg.content})

        return messages

    def get_summary(self, session_id: str) -> Optional[str]:
        """セッションの会話要約を取得"""
        if session_id in self._memories:
            return self._memories[session_id].moving_summary_buffer
        return self._summaries.get(session_id)

    def prune_memory(self, session_id: str):
        """
        メモリを整理（古いメッセージを要約に圧縮）
        長い会話での効率化
        """
        memory = self.get_memory(session_id)
        # LangChainのSummaryBufferMemoryが自動で管理するが、
        # 手動でprune_messageを呼ぶこともできる
        if hasattr(memory, 'prune'):
            memory.prune()

    def clear_session(self, session_id: str):
        """セッションのメモリをクリア"""
        if session_id in self._memories:
            del self._memories[session_id]
        if session_id in self._summaries:
            del self._summaries[session_id]


# シングルトンインスタンス
memory_manager = SessionMemoryManager()


def get_memory_manager() -> SessionMemoryManager:
    """メモリマネージャーを取得"""
    return memory_manager
