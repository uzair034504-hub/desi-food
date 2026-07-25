"""Anthropic provider — inactive until ANTHROPIC_API_KEY is set (this is the
paid provider you'll switch on later; https://console.anthropic.com).

Note: Anthropic's Messages API takes the system prompt as its own field, not as
a message in the list — this function extracts it automatically if present.
"""

import os
import requests

ANTHROPIC_URL = "https://api.anthropic.com/v1/messages"


def is_configured() -> bool:
    return bool(os.environ.get("ANTHROPIC_API_KEY"))


def chat(messages: list[dict], max_tokens: int = 700) -> str | None:
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        return None

    model = os.environ.get("ANTHROPIC_MODEL", "claude-sonnet-4-6")

    system_prompt = ""
    chat_messages = []
    for m in messages:
        if m["role"] == "system":
            system_prompt = m["content"]
        else:
            chat_messages.append(m)

    response = requests.post(
        ANTHROPIC_URL,
        headers={
            "x-api-key": api_key,
            "anthropic-version": "2023-06-01",
            "Content-Type": "application/json",
        },
        json={
            "model": model,
            "system": system_prompt,
            "messages": chat_messages,
            "max_tokens": max_tokens,
        },
        timeout=60,
    )

    if not response.ok:
        print(f"[anthropic] error {response.status_code}: {response.text}")
        return None

    data = response.json()
    return data["content"][0]["text"].strip()
