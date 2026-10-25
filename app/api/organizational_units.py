from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.access import commit_unique
from app.api.deps import get_optional_current_user, get_current_user
from app.db.session import get_db
from app.models import OrganizationalUnit, User, UserRole
from app.schemas.organizational_units import (
    OrganizationalUnitCreate,
    OrganizationalUnitResponse,
    OrganizationalUnitUpdate,
)


router = APIRouter(prefix="/organizational-units", tags=["organizational units"])


def _require_super_admin(user: User) -> None:
    if user.role != UserRole.SUPER_ADMIN.value:
        raise HTTPException(
            status_code=403, detail="Only SUPER_ADMIN can manage organizational units"
        )


@router.get("", response_model=list[OrganizationalUnitResponse])
def list_organizational_units(
    include_inactive: bool = False,
    limit: int = Query(default=100, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    user: User | None = Depends(get_optional_current_user),
    db: Session = Depends(get_db),
):
    if include_inactive and (user is None or user.role != UserRole.SUPER_ADMIN.value):
        raise HTTPException(status_code=403, detail="Only SUPER_ADMIN can view inactive units")
    query = select(OrganizationalUnit)
    if not include_inactive:
        query = query.where(OrganizationalUnit.is_active.is_(True))
    return list(db.scalars(query.order_by(OrganizationalUnit.name).offset(offset).limit(limit)))


@router.post("", response_model=OrganizationalUnitResponse, status_code=status.HTTP_201_CREATED)
def create_organizational_unit(
    payload: OrganizationalUnitCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _require_super_admin(user)
    unit = OrganizationalUnit(**payload.model_dump())
    db.add(unit)
    commit_unique(db, "An organizational unit with this name or code already exists")
    db.refresh(unit)
    return unit


@router.patch("/{unit_id}", response_model=OrganizationalUnitResponse)
def update_organizational_unit(
    unit_id: int,
    payload: OrganizationalUnitUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _require_super_admin(user)
    unit = db.get(OrganizationalUnit, unit_id)
    if unit is None:
        raise HTTPException(status_code=404, detail="Organizational unit not found")
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(unit, key, value)
    commit_unique(db, "An organizational unit with this name or code already exists")
    db.refresh(unit)
    return unit


@router.delete("/{unit_id}", status_code=status.HTTP_204_NO_CONTENT)
def deactivate_organizational_unit(
    unit_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _require_super_admin(user)
    unit = db.get(OrganizationalUnit, unit_id)
    if unit is None:
        raise HTTPException(status_code=404, detail="Organizational unit not found")
    unit.is_active = False
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
