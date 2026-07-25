"""Groq provider — fast, generous free tier. https://console.groq.com"""

import os
import base64
import requests

GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"


def is_configured() -> bool:
    return bool(os.environ.get("GROQ_API_KEY"))


def chat(messages: list[dict], max_tokens: int = 700) -> str | None:
    api_key = os.environ.get("GROQ_API_KEY")
    if not api_key:
        return None

    model = os.environ.get("GROQ_CHAT_MODEL", "openai/gpt-oss-120b")

    response = requests.post(
        GROQ_URL,
        headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
        json={
            "model": model,
            "messages": messages,
            "max_completion_tokens": max_tokens,
            "temperature": 0.7,
        },
        timeout=60,
    )

    if not response.ok:
        print(f"[groq] error {response.status_code}: {response.text}")
        return None

    data = response.json()
    return data["choices"][0]["message"]["content"].strip()


def vision_is_configured() -> bool:
    return bool(os.environ.get("GROQ_API_KEY"))


def identify_ingredients(image_path: str) -> str | None:
    api_key = os.environ.get("GROQ_API_KEY")
    if not api_key:
        return None

    model = os.environ.get("GROQ_VISION_MODEL", "qwen/qwen3.6-27b")

    ext = image_path.rsplit(".", 1)[-1].lower()
    mime = "image/png" if ext == "png" else "image/jpeg"
    with open(image_path, "rb") as f:
        b64 = base64.b64encode(f.read()).decode("utf-8")
    data_uri = f"data:{mime};base64,{b64}"

    response = requests.post(
        GROQ_URL,
        headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
        json={
            "model": model,
            "messages": [
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": (
                                "List every food ingredient you can identify in this photo. "
                                "Reply with ONLY a comma-separated list of ingredient names "
                                "(e.g. 'onion, tomato, chicken, garlic'). No extra text."
                            ),
                        },
                        {"type": "image_url", "image_url": {"url": data_uri}},
                    ],
                }
            ],
            "temperature": 0.3,
            "max_completion_tokens": 200,
        },
        timeout=60,
    )

    if not response.ok:
        print(f"[groq vision] error {response.status_code}: {response.text}")
        return None

    data = response.json()
    return data["choices"][0]["message"]["content"].strip()
