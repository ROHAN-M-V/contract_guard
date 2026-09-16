from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import or_
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.database.models import (
    Contract,
    Document,
    ContractVersion,
    Change,
    RiskScore,
    Alert,
)
from app.database.models.user import Profile
from app.schemas.analysis import ContractAnalysisResult
from app.services.analysis.ai_client import get_ai_client
from app.api.dependencies import get_current_user

router = APIRouter(prefix="/contracts/{contract_id}/analyze", tags=["Analysis"])


@router.post("", response_model=ContractAnalysisResult, status_code=status.HTTP_200_OK)
async def analyze_contract_endpoint(
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

    # Gather registered documents for this contract
    docs = db.query(Document).filter(Document.contract_id == contract.id).all()
    doc_payloads = [
        {
            "id": d.id,
            "filename": d.filename,
            "document_type": d.document_type,
            "version_number": d.version_number,
            "storage_path": d.storage_path,
            "mime_type": d.mime_type,
        }
        for d in docs
    ]

    contract_metadata = {
        "id": contract.id,
        "contract_number": contract.contract_number,
        "title": contract.title,
        "department": contract.department,
        "baseline_value": float(contract.baseline_value) if contract.baseline_value else 100000000.0,
        "current_value": float(contract.current_value) if contract.current_value else 141000000.0,
        "baseline_completion_date": str(contract.baseline_completion_date or "2026-12-31"),
        "current_completion_date": str(contract.current_completion_date or "2027-08-31"),
    }

    # Call the AI Client Adapter (Mock or External HTTP)
    ai_client = get_ai_client()
    analysis_result: ContractAnalysisResult = await ai_client.analyze_contract(
        contract_id=contract.contract_number or contract.id,
        documents=doc_payloads,
        contract_metadata=contract_metadata,
    )

    # 1. Update contract risk and current valuation
    contract.risk_score = analysis_result.risk.score
    contract.risk_level = analysis_result.risk.level
    if analysis_result.changes:
        for c in analysis_result.changes:
            if c.field == "contract_value" and c.new_value is not None:
                contract.current_value = float(c.new_value)
            if c.field == "subcontractor" and c.new_value is not None:
                contract.contractor = str(c.new_value)

    # 2. Persist RiskScore record
    risk_record = RiskScore(
        contract_id=contract.id,
        overall_score=analysis_result.risk.score,
        risk_level=analysis_result.risk.level,
        factors=[f.model_dump() for f in analysis_result.risk_factors],
    )
    db.add(risk_record)

    # 3. Persist Changes (replace or append)
    # Clear previous calculated changes for this contract to keep idempotency
    db.query(Change).filter(Change.contract_id == contract.id).delete()
    for item in analysis_result.changes:
        change_row = Change(
            contract_id=contract.id,
            from_version=0,
            to_version=analysis_result.current_version,
            field=item.field,
            old_value=item.old_value,
            new_value=item.new_value,
            absolute_change=item.absolute_change,
            percentage_change=item.percentage_change,
            severity=item.severity,
            evidence=[e.model_dump() for e in (item.evidence or [])],
        )
        db.add(change_row)

    # 4. Synchronize Timeline into ContractVersions if empty
    existing_versions = db.query(ContractVersion).filter(ContractVersion.contract_id == contract.id).count()
    if existing_versions == 0 and analysis_result.timeline:
        for t in analysis_result.timeline:
            v_row = ContractVersion(
                contract_id=contract.id,
                version_number=t.version,
                contract_value=t.contract_value,
                scope=t.major_changes or t.label,
                extracted_data={"label": t.label, "date": t.date},
            )
            db.add(v_row)

    # 5. Emit Alert if risk is HIGH or CRITICAL
    if analysis_result.risk.level in ["HIGH", "CRITICAL"]:
        alert = Alert(
            contract_id=contract.id,
            risk_level=analysis_result.risk.level,
            message=f"Cumulative cost drift reached +{analysis_result.drift.cost_percentage}%. Risk evaluation: {analysis_result.risk.level} ({analysis_result.risk.score}/100).",
        )
        db.add(alert)

    db.commit()
    db.refresh(contract)

    return analysis_result
