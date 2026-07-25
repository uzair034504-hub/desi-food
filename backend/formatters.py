def format_ingredients(ingredients: list[dict]) -> str:
    lines = []
    for ing in ingredients:
        qty = ing.get("qty", "")
        unit = ing.get("unit", "") or ""
        name = ing.get("name", "")
        lines.append(f"- {qty} {unit} {name}".replace("  ", " ").strip())
    return "\n".join(lines)


def format_recipe(r: dict) -> str:
    ingredients = format_ingredients(r["ingredients"])
    steps = "\n".join(f"{i+1}. {s}" for i, s in enumerate(r["steps"]))
    return (
        f"**{r['name']}** ({r.get('cuisine_region') or 'General'})\n\n"
        f"**Ingredients:**\n{ingredients}\n\n"
        f"**Tareeqa:**\n{steps}\n\n"
        f"Prep: {r.get('prep_time_minutes', '-')} min · "
        f"Cook: {r.get('cook_time_minutes', '-')} min · "
        f"Serves: {r.get('serves', '-')}"
    )


def format_masala(m: dict) -> str:
    ingredients = format_ingredients(m["ingredients"])
    used_for = ", ".join(m.get("used_for") or [])
    return (
        f"**{m['name']}**\n\n"
        f"**Ingredients:**\n{ingredients}\n\n"
        f"**Method:**\n{m['method']}\n\n"
        f"Used for: {used_for}"
    )


def format_sauce(s: dict) -> str:
    ingredients = format_ingredients(s["ingredients"])
    steps = "\n".join(f"{i+1}. {step}" for i, step in enumerate(s["steps"]))
    pairs_with = ", ".join(s.get("pairs_with") or [])
    return (
        f"**{s['name']}**\n\n"
        f"**Ingredients:**\n{ingredients}\n\n"
        f"**Steps:**\n{steps}\n\n"
        f"Pairs with: {pairs_with}"
    )
