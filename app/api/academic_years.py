from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.access import commit_unique
from app.api.deps import assert_unit_access, get_current_user
from app.db.session import get_db
from app.models import AcademicYear, AcademicYearStatus, OrganizationalUnit, User, UserRole
from app.schemas.academic_years import AcademicYearCreate, AcademicYearResponse


router = APIRouter(prefix="/academic-years", tags=["academic years"])


def _require_admin(user: User) -> None:
    if user.role not in {UserRole.UNIT_ADMIN.value, UserRole.SUPER_ADMIN.value}:
        raise HTTPException(status_code=403, detail="Only administrators can manage academic years")


@router.get("", response_model=list[AcademicYearResponse])
def list_academic_years(
    organizational_unit_id: int | None = Query(default=None, gt=0),
    include_closed: bool = False,
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = select(AcademicYear)
    if user.role == UserRole.SUPER_ADMIN.value:
        if organizational_unit_id is not None:
            query = query.where(AcademicYear.organizational_unit_id == organizational_unit_id)
    elif user.role == UserRole.UNIT_ADMIN.value:
        if organizational_unit_id is not None:
            assert_unit_access(user, organizational_unit_id)
        query = query.where(AcademicYear.organizational_unit_id == user.organizational_unit_id)
    elif user.role == UserRole.USER.value:
        if include_closed:
            raise HTTPException(
                status_code=403, detail="Closed years are only visible to administrators"
            )
        query = query.where(AcademicYear.status == AcademicYearStatus.OPEN.value)
        if organizational_unit_id is not None:
            query = query.where(AcademicYear.organizational_unit_id == organizational_unit_id)
    else:
        raise HTTPException(status_code=403, detail="Not allowed")

    if not include_closed:
        query = query.where(AcademicYear.status == AcademicYearStatus.OPEN.value)
    query = query.order_by(AcademicYear.label.desc()).offset(offset).limit(limit)
    return list(db.scalars(query))


@router.post("", response_model=AcademicYearResponse, status_code=status.HTTP_201_CREATED)
def open_academic_year(
    payload: AcademicYearCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _require_admin(user)
    unit_id = payload.organizational_unit_id
    if user.role == UserRole.UNIT_ADMIN.value:
        if unit_id is not None:
            assert_unit_access(user, unit_id)
        unit_id = user.organizational_unit_id
    elif unit_id is None:
        raise HTTPException(
            status_code=422, detail="organizational_unit_id is required for SUPER_ADMIN"
        )
    if unit_id is None:
        raise HTTPException(
            status_code=403, detail="Administrator is not assigned to an organizational unit"
        )

    unit = db.scalar(
        select(OrganizationalUnit).where(OrganizationalUnit.id == unit_id).with_for_update()
    )
    if unit is None or not unit.is_active:
        raise HTTPException(status_code=404, detail="Active organizational unit not found")
    existing_open_year = db.scalar(
        select(AcademicYear.id).where(
            AcademicYear.organizational_unit_id == unit_id,
            AcademicYear.status == AcademicYearStatus.OPEN.value,
        )
    )
    if existing_open_year is not None:
        raise HTTPException(
            status_code=409, detail="Close the current academic year before opening another"
        )

    year = AcademicYear(
        organizational_unit_id=unit_id,
        label=payload.label,
        status=AcademicYearStatus.OPEN.value,
        opened_by_user_id=user.id,
    )
    db.add(year)
    commit_unique(
        db, "This academic year already exists or another open year already exists in the unit"
    )
    db.refresh(year)
    return year


@router.post("/{academic_year_id}/activate", response_model=AcademicYearResponse)
def activate_imported_academic_year(
    academic_year_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _require_admin(user)
    year = db.get(AcademicYear, academic_year_id)
    if year is None:
        raise HTTPException(status_code=404, detail="Academic year not found")
    assert_unit_access(user, year.organizational_unit_id)
    if (
        year.status != AcademicYearStatus.CLOSED.value
        or year.closed_at is not None
        or year.closed_by_user_id is not None
        or year.opened_by_user_id is not None
    ):
        raise HTTPException(
            status_code=409,
            detail="Only imported academic years with unknown closure history can be activated",
        )

    unit = db.scalar(
        select(OrganizationalUnit)
        .where(OrganizationalUnit.id == year.organizational_unit_id)
        .with_for_update()
    )
    if unit is None or not unit.is_active:
        raise HTTPException(status_code=409, detail="The organizational unit is inactive")
    year = db.scalar(
        select(AcademicYear).where(AcademicYear.id == academic_year_id).with_for_update()
    )
    if year is None:
        raise HTTPException(status_code=404, detail="Academic year not found")
    existing_open_year = db.scalar(
        select(AcademicYear.id).where(
            AcademicYear.organizational_unit_id == year.organizational_unit_id,
            AcademicYear.status == AcademicYearStatus.OPEN.value,
        )
    )
    if existing_open_year is not None:
        raise HTTPException(status_code=409, detail="Close the current academic year first")

    year.status = AcademicYearStatus.OPEN.value
    year.opened_at = datetime.now(timezone.utc).replace(tzinfo=None)
    year.opened_by_user_id = user.id
    commit_unique(db, "Another open academic year already exists in the unit")
    db.refresh(year)
    return year


@router.post("/{academic_year_id}/close", status_code=status.HTTP_204_NO_CONTENT)
def close_academic_year(
    academic_year_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _require_admin(user)
    year = db.scalar(
        select(AcademicYear).where(AcademicYear.id == academic_year_id).with_for_update()
    )
    if year is None:
        raise HTTPException(status_code=404, detail="Academic year not found")
    assert_unit_access(user, year.organizational_unit_id)
    if year.status != AcademicYearStatus.OPEN.value:
        raise HTTPException(status_code=409, detail="Academic year is already closed")

    year.status = AcademicYearStatus.CLOSED.value
    year.closed_at = datetime.now(timezone.utc).replace(tzinfo=None)
    year.closed_by_user_id = user.id
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
