from typing import Dict, Iterable, Tuple


def calculate_risk_score(factors: Iterable[Tuple[str, float, float, str]]) -> Tuple[float, str]:
    """Return a 0-100 normalized weighted risk score and policy level."""
    factor_list = list(factors)
    weight_total = sum(weight for _, _, weight, _ in factor_list) or 1.0
    score = round(
        min(100.0, max(0.0, sum(min(100.0, max(0.0, value)) * weight for _, value, weight, _ in factor_list) / weight_total)),
        1,
    )
    level = "CRITICAL" if score >= 80 else "HIGH" if score >= 60 else "MEDIUM" if score >= 35 else "LOW"
    return score, level


def factor_dicts(factors: Iterable[Tuple[str, float, float, str]]) -> Iterable[Dict[str, object]]:
    return ({"name": name, "score": round(score, 1), "weight": weight, "reason": reason} for name, score, weight, reason in factors)