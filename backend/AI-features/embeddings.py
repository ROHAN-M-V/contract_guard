import math
import re
from collections import Counter
from typing import List, Sequence


class TextEmbedder:
    """Use sentence-transformers when available, with an offline fallback."""

    def __init__(self, model_name: str = "all-MiniLM-L6-v2"):
        self._model = None
        try:
            from sentence_transformers import SentenceTransformer

            self._model = SentenceTransformer(model_name)
        except Exception:
            pass

    def encode(self, texts: Sequence[str]) -> List[List[float]]:
        if self._model is not None:
            vectors = self._model.encode(list(texts), normalize_embeddings=True)
            return [vector.tolist() for vector in vectors]
        token_counts = [Counter(re.findall(r"[a-z0-9]+", text.lower())) for text in texts]
        vocabulary = sorted({token for counts in token_counts for token in counts})
        return [_normalized_counts(counts, vocabulary) for counts in token_counts]


def cosine_similarity(left: Sequence[float], right: Sequence[float]) -> float:
    denominator = math.sqrt(sum(value * value for value in left)) * math.sqrt(
        sum(value * value for value in right)
    )
    if denominator == 0:
        return 0.0
    return max(0.0, min(1.0, sum(a * b for a, b in zip(left, right)) / denominator))


def _normalized_counts(counts: Counter, vocabulary: List[str]) -> List[float]:
    magnitude = math.sqrt(sum(count * count for count in counts.values())) or 1.0
    return [counts[token] / magnitude for token in vocabulary]