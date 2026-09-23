"""Language-independent transcript-to-PDF page alignment."""
from __future__ import annotations

import math
import re
from collections import Counter


def words(text: str) -> list[str]:
    """Tokenize English, German, and other Latin-script text without stemming."""
    return re.findall(r"[^\W\d_]{2,}", text.casefold(), flags=re.UNICODE)


def group_segments(segments: list[dict], target_seconds: float = 24) -> list[dict]:
    """Combine tiny transcription segments into useful matching windows."""
    groups, current = [], None
    for segment in segments:
        if current is None:
            current = {"start": float(segment["start"]), "end": float(segment["end"]), "text": segment["text"].strip()}
        else:
            current["end"] = float(segment["end"])
            current["text"] += " " + segment["text"].strip()
        if current["end"] - current["start"] >= target_seconds:
            groups.append(current); current = None
    if current and current["text"]:
        groups.append(current)
    return groups


def align_segments(pages: list[str], segments: list[dict], minimum_score: float = 0.08) -> list[dict]:
    """Match timed transcript windows to pages using IDF-weighted token overlap.

    Each window is scored independently, intentionally allowing the narration to
    jump backward or forward to non-contiguous PDF sections.
    """
    page_tokens = [Counter(words(page)) for page in pages]
    document_frequency = Counter(token for tokens in page_tokens for token in tokens)
    count = max(1, len(pages))

    def weight(token: str) -> float:
        return math.log((count + 1) / (document_frequency[token] + 1)) + 1

    matches = []
    for group in group_segments(segments):
        transcript = Counter(words(group["text"]))
        denominator = sum(weight(token) * amount for token, amount in transcript.items()) or 1
        scores = [sum(weight(token) * min(amount, page.get(token, 0)) for token, amount in transcript.items()) / denominator for page in page_tokens]
        if not scores:
            continue
        page_index = max(range(len(scores)), key=scores.__getitem__)
        if scores[page_index] >= minimum_score:
            matches.append({
                "page": page_index + 1,
                "start": group["start"],
                "end": group["end"],
                "title": " ".join(group["text"].split()[:7]).rstrip(".,:;!?"),
                "confidence": round(scores[page_index], 3),
            })
    return matches
