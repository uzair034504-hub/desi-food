"""
Dastarkhwan AI — FastAPI backend.

Run locally with:
    uvicorn main:app --reload --port 8000

Endpoints:
    POST /api/conversations            -> create a new conversation
    GET  /api/conversations?user_id=..  -> list a user's conversations
    GET  /api/conversations/{id}/messages -> list messages in a conversation
    POST /api/chat                     -> send a message, get the assistant's reply
    POST /api/upload                   -> upload an ingredient photo
"""

import os
import uuid
import shutil
from pathlib import Path

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / ".env")
load_dotenv(BASE_DIR.parent / ".env")

import db
from llm import ask_llm, identify_ingredients_from_image, suggest_recipes_from_ingredients
from formatters import format_recipe, format_masala, format_sauce
from stores import find_nearby_stores, format_stores_reply

app = FastAPI(title="Dastarkhwan AI Backend")

# Allow the React dev server (and your deployed frontend) to call this API.
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.environ.get("ALLOWED_ORIGINS", "http://localhost:5173").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")


# ---------------------------------------------------------------
# Request/response models
# ---------------------------------------------------------------

class CreateConversationBody(BaseModel):
    user_id: str
    title: str = "New chat"


class ChatBody(BaseModel):
    user_id: str
    conversation_id: str
    message: str
    image_url: str | None = None      # public URL, used for display in chat history
    image_path: str | None = None     # local server path, used for vision analysis


class StoreSearchBody(BaseModel):
    lat: float
    lng: float
    ingredient: str = ""


# ---------------------------------------------------------------
# Routes
# ---------------------------------------------------------------

@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.post("/api/conversations")
def create_conversation(body: CreateConversationBody):
    return db.create_conversation(body.user_id, body.title)


@app.get("/api/conversations")
def get_conversations(user_id: str):
    return db.list_conversations(user_id)


@app.get("/api/conversations/{conversation_id}/messages")
def get_messages(conversation_id: str):
    return db.list_messages(conversation_id)


@app.post("/api/upload")
async def upload_photo(file: UploadFile = File(...)):
    ext = Path(file.filename).suffix
    filename = f"{uuid.uuid4()}{ext}"
    dest = UPLOAD_DIR / filename

    with dest.open("wb") as f:
        shutil.copyfileobj(file.file, f)

    # In production, point this at your real domain instead of localhost.
    base_url = os.environ.get("BACKEND_PUBLIC_URL", "http://localhost:8000")
    return {"url": f"{base_url}/uploads/{filename}", "path": str(dest)}


@app.post("/api/chat")
def chat(body: ChatBody):
    if not body.message and not body.image_url:
        raise HTTPException(400, "message or image_url is required")

    user_content = body.message or "Ye ingredients available hain, ye batao inse kya ban sakta hai."

    # Save the user's message first
    db.save_message(body.conversation_id, "user", user_content, body.image_url, source="user")

    # ---------------------------------------------------------
    # Case 1: an ingredient photo was uploaded -> vision model
    # ---------------------------------------------------------
    if body.image_path:
        detected = identify_ingredients_from_image(body.image_path)

        if not detected:
            answer = "Photo se ingredients pehchan nahi paya. Ek clearer photo try karein."
        else:
            # Cross-check against our own verified recipes first (free, instant)
            ingredient_names = [i.strip() for i in detected.split(",") if i.strip()]
            db_matches = db.match_recipes_by_ingredients(ingredient_names)

            llm_suggestions = suggest_recipes_from_ingredients(detected, body.message or "")

            db_section = ""
            if db_matches:
                names = ", ".join(m["name"] for m in db_matches[:3])
                db_section = f"\n\n**Humari verified recipes mein bhi ye mil sakti hain:** {names}"

            answer = f"Pehchana gaya: {detected}\n\n{llm_suggestions}{db_section}"

        saved = db.save_message(body.conversation_id, "assistant", answer, None, source="vision")
        return {"answer": answer, "source": "vision", "message": saved}

    # ---------------------------------------------------------
    # Case 2: text question -> DB first (fast, verified), then broad LLM
    # ---------------------------------------------------------
    match = db.search_knowledge_base(body.message)

    if match:
        if match["type"] == "recipe":
            answer = format_recipe(match["data"])
        elif match["type"] == "masala":
            answer = format_masala(match["data"])
        else:
            answer = format_sauce(match["data"])

        saved = db.save_message(body.conversation_id, "assistant", answer, None, source="db")
        return {"answer": answer, "source": "db", "message": saved}

    # Not in our verified DB -> answer broadly using the LLM (not limited to seed data)
    answer = ask_llm(body.message)

    # Log it so a human can verify and promote it into the permanent knowledge base later
    db.log_pending_review(body.message, answer)

    saved = db.save_message(body.conversation_id, "assistant", answer, None, source="llm")
    return {"answer": answer, "source": "llm", "message": saved}


@app.post("/api/stores")
def stores(body: StoreSearchBody):
    """Find nearby grocery stores for a missing ingredient, based on the user's location."""
    results = find_nearby_stores(body.lat, body.lng, body.ingredient)
    reply = format_stores_reply(results, body.ingredient or "ingredient")
    return {"stores": results, "reply": reply}
