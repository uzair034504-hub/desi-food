"""Hugging Face provider — uses the current Inference Providers router.
https://huggingface.co/docs/inference-providers
"""

import os
import requests

HF_URL = "https://router.huggingface.co/v1/chat/completions"


def is_configured() -> bool:
    return bool(os.environ.get("HF_API_KEY"))


def chat(messages: list[dict], max_tokens: int = 700) -> str | None:
    api_key = os.environ.get("HF_API_KEY")
    if not api_key:
        return None

    model = os.environ.get("HF_CHAT_MODEL", "Qwen/Qwen2.5-7B-Instruct:fastest")

    response = requests.post(
        HF_URL,
        headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
        json={
            "model": model,
            "messages": messages,
            "max_tokens": max_tokens,
            "temperature": 0.7,
        },
        timeout=60,
    )

    if not response.ok:
        print(f"[huggingface] error {response.status_code}: {response.text}")
        return None

    data = response.json()
    return data["choices"][0]["message"]["content"].strip()
