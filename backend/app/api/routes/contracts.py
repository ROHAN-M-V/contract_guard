from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import or_, desc, asc
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.database.models import Contract, ContractVersion, Document, Change, ReviewDecision
from app.database.models.user import Profile
from app.schemas.contract import (
    ContractCreate,
    ContractUpdate,
    ContractResponse,
    ContractSummaryResponse,
)
from app.schemas.common import PaginatedResponse
from app.api.dependencies import get_current_user, get_accessible_contract

router = APIRouter(prefix="/contracts", tags=["Contracts"])


@router.post("", response_model=ContractResponse, status_code=status.HTTP_201_CREATED)
async def create_contract(
    data: ContractCreate,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(get_current_user),
):
    existing = db.query(Contract).filter(Contract.contract_number == data.contract_number).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Contract with number '{data.contract_number}' already exists",
        )

    contract = Contract(
        contract_number=data.contract_number,
        title=data.title,
        description=data.description,
        department=data.department,
        contractor=data.contractor,
        baseline_value=data.baseline_value,
        current_value=data.current_value or data.baseline_value,
        baseline_start_date=data.baseline_start_date,
        current_start_date=data.current_start_date or data.baseline_start_date,
        baseline_completion_date=data.baseline_completion_date,
        current_completion_date=data.current_completion_date or data.baseline_completion_date,
        status=data.status or "ACTIVE",
        created_by=current_user.id,
    )
    db.add(contract)
    db.commit()
    db.refresh(contract)
    return contract


@router.get("", response_model=PaginatedResponse[ContractResponse])
async def list_contracts(
    search: Optional[str] = None,
    risk_level: Optional[str] = None,
    status: Optional[str] = None,
    department: Optional[str] = None,
    sort_by: str = Query("risk_score", description="field to sort by"),
    sort_order: str = Query("desc", pattern="^(asc|desc)$"),
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: Profile = Depends(get_current_user),
):
    query = db.query(Contract)
    if current_user.role != "ADMIN":
        query = query.filter(
            (Contract.created_by == current_user.id)
            | Contract.department.ilike(f"%{(current_user.department or '').strip()}%")
            | Contract.department.ilike(f"{(current_user.department or '').strip()}%")
        )

    if search:
        search_pattern = f"%{search}%"
        query = query.filter(
            or_(
                Contract.contract_number.ilike(search_pattern),
                Contract.title.ilike(search_pattern),
                Contract.contractor.ilike(search_pattern),
                Contract.department.ilike(search_pattern),
            )
        )

    if risk_level:
        query = query.filter(Contract.risk_level == risk_level.upper())

    if status:
        query = query.filter(Contract.status == status.upper())

    if department:
        query = query.filter(Contract.department.ilike(f"%{department}%"))

    # Sorting
    sort_col = getattr(Contract, sort_by, Contract.risk_score)
    if sort_order.lower() == "desc":
        query = query.order_by(desc(sort_col).nullslast())
    else:
        query = query.order_by(asc(sort_col).nullsfirst())

    total = query.count()
    items = query.offset((page - 1) * page_size).limit(page_size).all()
    total_pages = (total + page_size - 1) // page_size if total > 0 else 1

    return PaginatedResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


@router.get("/{contract_id}", response_model=ContractResponse)
async def get_contract(
    contract_id: str,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(get_current_user),
):
    contract = get_accessible_contract(contract_id, db, current_user)
    return contract


@router.patch("/{contract_id}", response_model=ContractResponse)
async def update_contract(
    contract_id: str,
    data: ContractUpdate,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(get_current_user),
):
    contract = get_accessible_contract(contract_id, db, current_user)

    update_dict = data.model_dump(exclude_unset=True)
    for key, value in update_dict.items():
        setattr(contract, key, value)

    db.commit()
    db.refresh(contract)
    return contract


@router.delete("/{contract_id}", status_code=status.HTTP_200_OK)
async def delete_contract(
    contract_id: str,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(get_current_user),
):
    contract = get_accessible_contract(contract_id, db, current_user)

    # Check if contract has documents - if so, soft-delete / close as specified in guidelines
    doc_count = db.query(Document).filter(Document.contract_id == contract.id).count()
    if doc_count > 0:
        contract.status = "CLOSED"
        db.commit()
        return {"message": "Contract has historical documents; archived and marked as CLOSED"}

    db.delete(contract)
    db.commit()
    return {"message": "Contract deleted successfully"}


@router.get("/{contract_id}/summary", response_model=ContractSummaryResponse)
async def get_contract_summary(
    contract_id: str,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(get_current_user),
):
    contract = get_accessible_contract(contract_id, db, current_user)

    # Calculate drift metrics
    cost_drift = None
    if contract.baseline_value and contract.current_value:
        base = float(contract.baseline_value)
        curr = float(contract.current_value)
        if base > 0:
            cost_drift = round(((curr - base) / base) * 100, 1)

    schedule_drift_months = None
    if contract.baseline_completion_date and contract.current_completion_date:
        days_diff = (contract.current_completion_date - contract.baseline_completion_date).days
        schedule_drift_months = round(days_diff / 30.4, 1)

    v_count = db.query(ContractVersion).filter(ContractVersion.contract_id == contract.id).count()
    d_count = db.query(Document).filter(Document.contract_id == contract.id).count()
    c_count = db.query(Change).filter(Change.contract_id == contract.id).count()

    latest_rev = (
        db.query(ReviewDecision)
        .filter(ReviewDecision.contract_id == contract.id)
        .order_by(desc(ReviewDecision.created_at))
        .first()
    )

    return ContractSummaryResponse(
        id=contract.id,
        contract_number=contract.contract_number,
        title=contract.title,
        department=contract.department,
        contractor=contract.contractor,
        status=contract.status,
        risk_score=float(contract.risk_score) if contract.risk_score is not None else None,
        risk_level=contract.risk_level,
        baseline_value=float(contract.baseline_value) if contract.baseline_value is not None else None,
        current_value=float(contract.current_value) if contract.current_value is not None else None,
        cost_drift_percentage=cost_drift,
        baseline_completion_date=contract.baseline_completion_date,
        current_completion_date=contract.current_completion_date,
        schedule_drift_months=schedule_drift_months,
        version_count=v_count,
        document_count=d_count,
        change_count=c_count,
        latest_review_decision=latest_rev.decision if latest_rev else None,
        last_updated=contract.updated_at,
    )
