from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from app.core.security import decode_token
from app.database.session import get_db
from app.database.models.user import Profile
from app.database.models import Contract

security = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: Session = Depends(get_db),
) -> Profile:
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = credentials.credentials
    payload = decode_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

    email: str = payload.get("email") or payload.get("sub")
    if not email:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token missing subject identity",
        )

    user = db.query(Profile).filter(Profile.email == email).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account not found",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return user


async def get_current_admin(
    current_user: Profile = Depends(get_current_user),
) -> Profile:
    if current_user.role != "ADMIN":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Administrative privileges required",
        )
    return current_user


def get_accessible_contract(
    contract_id: str,
    db: Session,
    current_user: Profile,
) -> Contract:
    contract = db.query(Contract).filter(
        (Contract.id == contract_id) | (Contract.contract_number == contract_id)
    ).first()
    if not contract:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Contract not found")

    if current_user.role == "ADMIN":
        return contract

    user_department = (current_user.department or "").strip().lower()
    contract_department = (contract.department or "").strip().lower()
    same_department = user_department and (
        user_department == contract_department
        or user_department.startswith(contract_department)
        or contract_department.startswith(user_department)
    )
    if contract.created_by != current_user.id and not same_department:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Contract access denied")
    return contract
