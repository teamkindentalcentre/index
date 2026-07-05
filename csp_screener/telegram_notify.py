"""Send the nightly report via the Telegram Bot API."""

from __future__ import annotations

import requests

MAX_MESSAGE_LEN = 4096  # Telegram hard limit per message


def send_message(token: str, chat_id: str, text: str) -> None:
    """Send `text` (HTML parse mode), splitting on newlines if over the length limit."""
    chunks: list[str] = []
    while len(text) > MAX_MESSAGE_LEN:
        cut = text.rfind("\n", 0, MAX_MESSAGE_LEN)
        if cut <= 0:
            cut = MAX_MESSAGE_LEN
        chunks.append(text[:cut])
        text = text[cut:].lstrip("\n")
    chunks.append(text)

    for chunk in chunks:
        resp = requests.post(
            f"https://api.telegram.org/bot{token}/sendMessage",
            json={
                "chat_id": chat_id,
                "text": chunk,
                "parse_mode": "HTML",
                "disable_web_page_preview": True,
            },
            timeout=30,
        )
        if not resp.ok:
            raise RuntimeError(f"Telegram send failed ({resp.status_code}): {resp.text[:300]}")
