from pathlib import Path
from typing import List, Optional
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy import func, or_
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.database.models import Contract, Document
from app.database.models.user import Profile
from app.schemas.document import DocumentResponse, DocumentDownloadUrlResponse
from app.services.storage.storage_service import storage_service, STORAGE_LOCAL_DIR
from app.api.dependencies import get_current_user

router = APIRouter(tags=["Documents"])


@router.post("/contracts/{contract_id}/documents", response_model=DocumentResponse, status_code=status.HTTP_201_CREATED)
async def upload_document(
    contract_id: str,
    file: UploadFile = File(...),
    document_type: str = Form("AMENDMENT"),  # BASELINE, AMENDMENT, INVOICE, PROGRESS_REPORT
    version_number: Optional[int] = Form(None),
    db: Session = Depends(get_db),
    current_user: Profile = Depends(get_current_user),
):
    contract = db.query(Contract).filter(
        or_(Contract.id == contract_id, Contract.contract_number == contract_id)
    ).first()
    if not contract:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Contract not found",
        )

    # Revision numbers are assigned by the backend so clients cannot create duplicates.
    latest_version = db.query(func.max(Document.version_number)).filter(
        Document.contract_id == contract.id
    ).scalar()
    version_number = (latest_version + 1) if latest_version is not None else 1

    content = await file.read()
    file_size = len(content)

    doc = Document(
        contract_id=contract.id,
        document_type=document_type.upper(),
        version_number=version_number,
        filename=file.filename,
        storage_path="",
        mime_type=file.content_type or "application/pdf",
        file_size=file_size,
        processing_status="PROCESSING",
        uploaded_by=current_user.id,
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)

    # Upload file to storage
    storage_path = await storage_service.upload_file(
        contract_id=contract.id,
        document_id=doc.id,
        filename=file.filename,
        content=content,
        mime_type=doc.mime_type,
    )
    doc.storage_path = storage_path
    doc.processing_status = "COMPLETED"
    db.commit()
    db.refresh(doc)

    return doc


@router.get("/contracts/{contract_id}/documents", response_model=List[DocumentResponse])
async def list_contract_documents(
    contract_id: str,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(get_current_user),
):
    contract = db.query(Contract).filter(
        or_(Contract.id == contract_id, Contract.contract_number == contract_id)
    ).first()
    if not contract:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Contract not found",
        )

    docs = (
        db.query(Document)
        .filter(Document.contract_id == contract.id)
        .order_by(Document.created_at.desc())
        .all()
    )
    return docs


@router.get("/documents/{document_id}", response_model=DocumentResponse)
async def get_document(
    document_id: str,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(get_current_user),
):
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found",
        )
    return doc


@router.delete("/documents/{document_id}", status_code=status.HTTP_200_OK)
async def delete_document(
    document_id: str,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(get_current_user),
):
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found",
        )

    if doc.storage_path:
        await storage_service.delete_file(doc.storage_path)

    db.delete(doc)
    db.commit()
    return {"message": "Document deleted successfully"}


@router.post("/documents/{document_id}/download-url", response_model=DocumentDownloadUrlResponse)
async def get_document_download_url(
    document_id: str,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(get_current_user),
):
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found",
        )

    signed_url = await storage_service.create_signed_url(doc.storage_path)
    return DocumentDownloadUrlResponse(
        document_id=doc.id,
        download_url=signed_url,
        filename=doc.filename,
        expires_in_seconds=3600,
    )


@router.get("/documents/download-file")
async def download_file_stream(
    path: str,
):
    file_path = (STORAGE_LOCAL_DIR / path).resolve()
    if not file_path.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document content not available on disk",
        )
    return FileResponse(file_path, filename=file_path.name)
