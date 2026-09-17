import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, BigInteger, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from app.database.base import Base

class Document(Base):
    __tablename__ = "documents"
    __table_args__ = (UniqueConstraint("contract_id", "version_number", name="uq_document_contract_version"),)

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    contract_id = Column(String(36), ForeignKey("contracts.id", ondelete="CASCADE"), nullable=False, index=True)
    
    document_type = Column(String(50), nullable=False)  # BASELINE, AMENDMENT, INVOICE, PROGRESS_REPORT
    version_number = Column(Integer, nullable=True)
    
    filename = Column(String(255), nullable=False)
    storage_path = Column(String(500), nullable=False)
    mime_type = Column(String(100), nullable=True)
    file_size = Column(BigInteger, nullable=True)
    
    processing_status = Column(String(50), nullable=False, default="UPLOADED")  # UPLOADED, PROCESSING, COMPLETED, FAILED
    uploaded_by = Column(String(36), nullable=True)
    
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    contract = relationship("Contract", back_populates="documents")
    version = relationship("ContractVersion", back_populates="document", uselist=False)
