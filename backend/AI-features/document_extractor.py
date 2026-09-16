from pathlib import Path
from typing import Any, Dict, List


def extract_document_text(path: Path, mime_type: str = "") -> List[Dict[str, Any]]:
    """Extract page-aware text from PDFs or UTF-8 documents."""
    if not path.exists():
        return []
    if path.suffix.lower() == ".pdf" or mime_type == "application/pdf":
        return _extract_pdf_text(path)
    try:
        text = path.read_text(encoding="utf-8", errors="ignore").strip()
    except OSError:
        return []
    return [{"page": 1, "text": text}] if text else []


def _extract_pdf_text(path: Path) -> List[Dict[str, Any]]:
    pages: List[Dict[str, Any]] = []
    try:
        from pypdf import PdfReader

        reader = PdfReader(str(path))
        for page_number, page in enumerate(reader.pages, start=1):
            text = (page.extract_text() or "").strip()
            if text:
                pages.append({"page": page_number, "text": text})
    except (ImportError, OSError, ValueError):
        pass
    return pages or _ocr_pdf(path)


def _ocr_pdf(path: Path) -> List[Dict[str, Any]]:
    try:
        import pytesseract
        from pdf2image import convert_from_path
    except ImportError:
        return []
    try:
        images = convert_from_path(str(path))
        pages = []
        for page_number, image in enumerate(images, start=1):
            text = pytesseract.image_to_string(image).strip()
            if text:
                pages.append({"page": page_number, "text": text})
        return pages
    except (OSError, RuntimeError, ValueError):
        return []