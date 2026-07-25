"""
Database layer — plain psycopg2, no ORM magic, so it's easy to read and modify.
Connects directly to your Postgres (Supabase's Postgres works fine here too —
we just talk to it directly instead of going through Supabase's JS client).

If the remote Postgres host is unavailable (common in local/dev environments),
the module falls back to an in-memory store so the chat API can still function.
"""

import os
import uuid
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path

import psycopg2
import psycopg2.extras
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / ".env")
load_dotenv(BASE_DIR.parent / ".env")

DATABASE_URL = os.environ.get("DATABASE_URL", "")  # postgres://user:pass@host:5432/dbname

_FALLBACK_CONVERSATIONS: dict[str, dict] = {}
_FALLBACK_MESSAGES: dict[str, list[dict]] = {}
_FALLBACK_REVIEWS: list[dict] = []


def _reset_runtime_state():
    global _FALLBACK_CONVERSATIONS, _FALLBACK_MESSAGES, _FALLBACK_REVIEWS
    _FALLBACK_CONVERSATIONS = {}
    _FALLBACK_MESSAGES = {}
    _FALLBACK_REVIEWS = []


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


@contextmanager
def get_conn():
    if not DATABASE_URL:
        raise psycopg2.OperationalError("DATABASE_URL is not configured")

    connect_kwargs = {}
    if "supabase.co" in DATABASE_URL and "sslmode=" not in DATABASE_URL:
        connect_kwargs["sslmode"] = "require"

    conn = psycopg2.connect(DATABASE_URL, **connect_kwargs)
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def dict_cursor(conn):
    return conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)


# ---------------------------------------------------------------
# Knowledge base search (recipes / masalas / sauces)
# ---------------------------------------------------------------

def search_knowledge_base(query: str) -> dict | None:
    try:
        normalized = f"%{query.lower()}%"

        with get_conn() as conn:
            cur = dict_cursor(conn)

            cur.execute(
                """
                SELECT * FROM recipes
                WHERE lower(name) LIKE %s OR %s = ANY(lower(aliases::text)::text[])
                LIMIT 1
                """,
                (normalized, query.lower()),
            )
            row = cur.fetchone()
            if row:
                return {"type": "recipe", "data": dict(row)}

            cur.execute(
                "SELECT * FROM masalas WHERE lower(name) LIKE %s LIMIT 1",
                (normalized,),
            )
            row = cur.fetchone()
            if row:
                return {"type": "masala", "data": dict(row)}

            cur.execute(
                "SELECT * FROM sauces WHERE lower(name) LIKE %s LIMIT 1",
                (normalized,),
            )
            row = cur.fetchone()
            if row:
                return {"type": "sauce", "data": dict(row)}
    except psycopg2.Error:
        return None

    return None


def match_recipes_by_ingredients(ingredient_names: list[str]) -> list[dict]:
    try:
        with get_conn() as conn:
            cur = dict_cursor(conn)
            cur.execute("SELECT * FROM recipes")
            recipes = cur.fetchall()
    except psycopg2.Error:
        return []

    scored = []
    wanted = {n.lower() for n in ingredient_names}
    for r in recipes:
        have = {ing["name"].lower() for ing in r["ingredients"]}
        match_count = len(wanted & have)
        if match_count > 0:
            scored.append({**r, "match_count": match_count, "total_required": len(have)})

    scored.sort(key=lambda r: r["match_count"], reverse=True)
    return scored[:10]


# ---------------------------------------------------------------
# Conversations & messages
# ---------------------------------------------------------------

def create_conversation(user_id: str, title: str = "New chat") -> dict:
    try:
        with get_conn() as conn:
            cur = dict_cursor(conn)
            cur.execute(
                "INSERT INTO conversations (id, user_id, title) VALUES (%s, %s, %s) RETURNING *",
                (str(uuid.uuid4()), user_id, title),
            )
            return dict(cur.fetchone())
    except psycopg2.Error:
        conversation_id = str(uuid.uuid4())
        payload = {
            "id": conversation_id,
            "user_id": user_id,
            "title": title,
            "created_at": _now(),
            "updated_at": _now(),
        }
        _FALLBACK_CONVERSATIONS[conversation_id] = payload
        return payload


def list_conversations(user_id: str) -> list[dict]:
    try:
        with get_conn() as conn:
            cur = dict_cursor(conn)
            cur.execute(
                "SELECT * FROM conversations WHERE user_id = %s ORDER BY updated_at DESC",
                (user_id,),
            )
            return [dict(r) for r in cur.fetchall()]
    except psycopg2.Error:
        fallback = [
            item for item in _FALLBACK_CONVERSATIONS.values()
            if item.get("user_id") == user_id
        ]
        return sorted(fallback, key=lambda item: item.get("updated_at", ""), reverse=True)


def list_messages(conversation_id: str) -> list[dict]:
    try:
        with get_conn() as conn:
            cur = dict_cursor(conn)
            cur.execute(
                "SELECT * FROM messages WHERE conversation_id = %s ORDER BY created_at ASC",
                (conversation_id,),
            )
            return [dict(r) for r in cur.fetchall()]
    except psycopg2.Error:
        return _FALLBACK_MESSAGES.get(conversation_id, [])


def save_message(conversation_id: str, role: str, content: str, image_url: str | None, source: str) -> dict:
    try:
        with get_conn() as conn:
            cur = dict_cursor(conn)
            cur.execute(
                """
                INSERT INTO messages (id, conversation_id, role, content, image_url, source)
                VALUES (%s, %s, %s, %s, %s, %s) RETURNING *
                """,
                (str(uuid.uuid4()), conversation_id, role, content, image_url, source),
            )
            return dict(cur.fetchone())
    except psycopg2.Error:
        message_id = str(uuid.uuid4())
        payload = {
            "id": message_id,
            "conversation_id": conversation_id,
            "role": role,
            "content": content,
            "image_url": image_url,
            "source": source,
            "created_at": _now(),
        }
        _FALLBACK_MESSAGES.setdefault(conversation_id, []).append(payload)
        return payload


def log_pending_review(question: str, ai_answer: str):
    try:
        with get_conn() as conn:
            cur = conn.cursor()
            cur.execute(
                "INSERT INTO pending_reviews (id, question, ai_generated_answer) VALUES (%s, %s, %s)",
                (str(uuid.uuid4()), question, ai_answer),
            )
    except psycopg2.Error:
        _FALLBACK_REVIEWS.append(
            {
                "id": str(uuid.uuid4()),
                "question": question,
                "ai_generated_answer": ai_answer,
                "status": "pending",
                "created_at": _now(),
            }
        )
