import re
from pathlib import Path
from typing import Any, Dict, List

from .document_extractor import extract_document_text
from .embeddings import TextEmbedder, cosine_similarity
from .prompts import build_analysis_prompt
from .risk import calculate_risk_score, factor_dicts


def analyze_documents(documents: List[Dict[str, Any]], storage_root: Path) -> Dict[str, Any]:
    extracted: List[Dict[str, Any]] = []
    for document in documents:
        pages = extract_document_text(
            storage_root / document.get("storage_path", ""), document.get("mime_type", "")
        )
        extracted.append({**document, "pages": pages, "text": "\n".join(page["text"] for page in pages)})

    baseline = next((doc for doc in extracted if doc.get("document_type") == "BASELINE"), None)
    baseline_text = (baseline or (extracted[0] if extracted else {})).get("text", "")
    amendment_text = "\n".join(doc.get("text", "") for doc in extracted if doc is not baseline)
    similarity = 1.0
    if baseline_text and amendment_text:
        baseline_vector, amendment_vector = TextEmbedder().encode([baseline_text, amendment_text])
        similarity = round(cosine_similarity(baseline_vector, amendment_vector), 3)

    cost_pct = _extract_percentage(amendment_text)
    factors = [
        ("Cost deviation", min(100.0, cost_pct * 1.5), 0.45, f"Extracted cost variance is {cost_pct:.1f}%."),
        ("Scope similarity", (1.0 - similarity) * 100.0, 0.35, f"Amendment similarity to baseline is {similarity:.3f}."),
        ("Document cadence", min(100.0, len(extracted) * 10.0), 0.20, f"{len(extracted)} documents were analyzed."),
    ]
    score, level = calculate_risk_score(factors)
    return {
        "documents": extracted,
        "prompt": build_analysis_prompt(baseline_text, amendment_text),
        "scope_similarity": similarity,
        "risk_score": score,
        "risk_level": level,
        "cost_percentage": cost_pct,
        "risk_factors": list(factor_dicts(factors)),
    }


def _extract_percentage(text: str) -> float:
    values = [float(value) for value in re.findall(r"(\d+(?:\.\d+)?)\s*%", text)]
    return max(values, default=0.0)