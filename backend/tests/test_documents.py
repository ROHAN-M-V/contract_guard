import io


def test_list_and_upload_documents(client):
    # List documents for flagship
    res = client.get("/api/v1/contracts/PWD-2026-014/documents")
    assert res.status_code == 200
    docs = res.json()
    assert len(docs) >= 5

    # Upload test document
    dummy_pdf_content = b"%PDF-1.4 synthetic test content for contract amendment"
    files = {"file": ("test_amendment_5.pdf", io.BytesIO(dummy_pdf_content), "application/pdf")}
    data = {"document_type": "AMENDMENT"}

    upload_res = client.post(
        "/api/v1/contracts/PWD-2026-014/documents",
        files=files,
        data=data,
    )
    assert upload_res.status_code == 201
    uploaded_doc = upload_res.json()
    assert uploaded_doc["filename"] == "test_amendment_5.pdf"
    assert uploaded_doc["document_type"] == "AMENDMENT"
    assert uploaded_doc["version_number"] == 5
    assert uploaded_doc["processing_status"] == "COMPLETED"

    # Test download-url
    doc_id = uploaded_doc["id"]
    url_res = client.post(f"/api/v1/documents/{doc_id}/download-url")
    assert url_res.status_code == 200
    assert "download_url" in url_res.json()
