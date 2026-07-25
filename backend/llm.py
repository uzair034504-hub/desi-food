"""
Multi-provider LLM orchestrator.

Tries providers in order (default: Groq -> Hugging Face -> Anthropic) and falls
through to the next one if a provider isn't configured, errors out, or hits a
rate limit. This means you can run on free tiers (Groq + Hugging Face) today,
and simply add ANTHROPIC_API_KEY later — no code changes needed, it'll
automatically join the rotation wherever you place it in LLM_PROVIDER_ORDER.

Set the order via env var, e.g.:
    LLM_PROVIDER_ORDER=groq,huggingface,anthropic
Only providers with an API key set are actually used; the rest are skipped.
"""

import os
from providers import groq_provider, huggingface_provider, anthropic_provider

PROVIDERS = {
    "groq": groq_provider,
    "huggingface": huggingface_provider,
    "anthropic": anthropic_provider,
}

DEFAULT_ORDER = "groq,huggingface,anthropic"

SYSTEM_PROMPT = """You are Dastarkhwan AI, a knowledgeable food assistant covering desi
(Pakistani/Indian) cuisine, international fast food, spice mixes (masalas), and sauces
from around the world. You are NOT limited to any fixed list — answer any recipe,
masala, or sauce question the user asks, using your general culinary knowledge.

Always structure recipe answers as:
1. A short intro line
2. **Ingredients** with quantities
3. **Steps** as a numbered list
4. Prep/cook time and servings if relevant

Language rule: reply in the SAME language style the user wrote in. If they write in
Roman Urdu/Hinglish (Roman script mixing Urdu/Hindi and English), reply the same way.
If they write in English, reply in English. If they explicitly ask for both, give the
English version first, then the Roman Urdu version clearly separated with a heading.
"""


def _provider_order() -> list[str]:
    order = os.environ.get("LLM_PROVIDER_ORDER", DEFAULT_ORDER)
    return [p.strip() for p in order.split(",") if p.strip()]


def ask_llm(user_message: str) -> str:
    """Main text-based recipe/masala/sauce Q&A — tries each configured provider in order."""
    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": user_message},
    ]

    for name in _provider_order():
        provider = PROVIDERS.get(name)
        if not provider or not provider.is_configured():
            continue

        try:
            result = provider.chat(messages)
            if result:
                print(f"[llm] answered by: {name}")
                return result
        except Exception as e:
            print(f"[llm] provider '{name}' raised an error: {e}")
            continue

    return (
        "Abhi koi AI provider available nahi hai. Backend ke .env mein "
        "GROQ_API_KEY ya HF_API_KEY set karein."
    )


def identify_ingredients_from_image(image_path: str) -> str:
    """
    Vision is currently handled by Groq only (qwen/qwen3.6-27b). Hugging Face and
    Anthropic vision support can be added here the same way once needed.
    """
    if groq_provider.vision_is_configured():
        try:
            result = groq_provider.identify_ingredients(image_path)
            if result:
                return result
        except Exception as e:
            print(f"[vision] groq raised an error: {e}")

    return ""


def suggest_recipes_from_ingredients(ingredient_list: str, user_note: str = "") -> str:
    """Asks the LLM to suggest what can be cooked from a given list of ingredients."""
    prompt = (
        f"I have these ingredients available: {ingredient_list}. "
        f"{user_note} "
        "Suggest 2-3 dishes I could make with what I have (desi or fast-food style), "
        "with a short ingredient list and steps for the best one."
    )
    return ask_llm(prompt)
