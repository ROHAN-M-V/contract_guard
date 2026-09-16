import importlib


analyze_documents = importlib.import_module("AI-features.pipeline").analyze_documents


def test_ai_pipeline_extracts_text_and_calculates_risk(tmp_path):
    baseline = tmp_path / "baseline.txt"
    amendment = tmp_path / "amendment.txt"
    baseline.write_text("The fixed contract price is 100. Delivery is due in June.", encoding="utf-8")
    amendment.write_text("The contract price increased by 25%. Delivery is due in August.", encoding="utf-8")

    result = analyze_documents(
        [
            {
                "id": "base",
                "filename": "baseline.txt",
                "document_type": "BASELINE",
                "storage_path": "baseline.txt",
                "mime_type": "text/plain",
            },
            {
                "id": "amendment",
                "filename": "amendment.txt",
                "document_type": "AMENDMENT",
                "storage_path": "amendment.txt",
                "mime_type": "text/plain",
            },
        ],
        tmp_path,
    )

    assert result["documents"][0]["pages"][0]["text"].startswith("The fixed contract")
    assert 0.0 <= result["scope_similarity"] <= 1.0
    assert result["risk_score"] > 0.0
    assert result["risk_level"] in {"LOW", "MEDIUM", "HIGH", "CRITICAL"}
    assert "baseline" in result["prompt"].lower()