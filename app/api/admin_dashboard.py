from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import case, distinct, func, or_, select
from sqlalchemy.orm import Session

from app.api.deps import assert_unit_access, get_current_user
from app.db.session import get_db
from app.models import (
    AcademicYear,
    AcademicYearStatus,
    Course,
    Discipline,
    OrganizationalUnit,
    Profile,
    ProfilePublicationStatus,
    User,
    UserRole,
)


router = APIRouter(prefix="/admin", tags=["administration"])


@router.get("/dashboard")
def get_dashboard_statistics(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if user.role != UserRole.SUPER_ADMIN.value:
        raise HTTPException(status_code=403, detail="Only SUPER_ADMIN can view global statistics")

    def count(model, *conditions) -> int:
        query = select(func.count()).select_from(model)
        if conditions:
            query = query.where(*conditions)
        return int(db.scalar(query) or 0)

    unit_rows = db.execute(
        select(
            OrganizationalUnit.id,
            OrganizationalUnit.name,
            OrganizationalUnit.code,
            OrganizationalUnit.is_active,
            func.count(distinct(Profile.id)).label("profiles_count"),
            func.count(
                distinct(
                    case(
                        (
                            Profile.publication_status == ProfilePublicationStatus.PUBLISHED.value,
                            Profile.id,
                        ),
                        else_=None,
                    )
                )
            ).label("published_profiles_count"),
            func.count(distinct(Course.id)).label("courses_count"),
        )
        .outerjoin(Profile, Profile.organizational_unit_id == OrganizationalUnit.id)
        .outerjoin(Course, Course.organizational_unit_id == OrganizationalUnit.id)
        .group_by(OrganizationalUnit.id)
        .order_by(OrganizationalUnit.name)
    ).all()

    return {
        "users_total": count(User),
        "users_active": count(User, User.is_active.is_(True)),
        "users_super_admin": count(
            User, User.role == UserRole.SUPER_ADMIN.value, User.is_active.is_(True)
        ),
        "profiles_total": count(Profile),
        "profiles_published": count(
            Profile, Profile.publication_status == ProfilePublicationStatus.PUBLISHED.value
        ),
        "profiles_draft": count(
            Profile, Profile.publication_status == ProfilePublicationStatus.DRAFT.value
        ),
        "profiles_inactive": count(
            Profile, Profile.publication_status == ProfilePublicationStatus.INACTIVE.value
        ),
        "courses_total": count(Course),
        "disciplines_total": count(Discipline),
        "academic_years_open": count(
            AcademicYear, AcademicYear.status == AcademicYearStatus.OPEN.value
        ),
        "units": [
            {
                "id": row.id,
                "name": row.name,
                "code": row.code,
                "is_active": row.is_active,
                "profiles_count": row.profiles_count,
                "published_profiles_count": row.published_profiles_count,
                "courses_count": row.courses_count,
            }
            for row in unit_rows
        ],
    }


@router.get("/unit-dashboard")
def get_unit_dashboard_statistics(
    organizational_unit_id: int | None = Query(default=None, gt=0),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if user.role == UserRole.UNIT_ADMIN.value:
        if organizational_unit_id is not None:
            assert_unit_access(user, organizational_unit_id)
        unit_id = user.organizational_unit_id
    elif user.role == UserRole.SUPER_ADMIN.value:
        if organizational_unit_id is None:
            raise HTTPException(status_code=422, detail="organizational_unit_id is required")
        unit_id = organizational_unit_id
    else:
        raise HTTPException(status_code=403, detail="Only administrators can view unit statistics")

    unit = db.get(OrganizationalUnit, unit_id) if unit_id is not None else None
    if unit is None:
        raise HTTPException(status_code=404, detail="Organizational unit not found")

    def count(model, *conditions) -> int:
        query = select(func.count()).select_from(model)
        if conditions:
            query = query.where(*conditions)
        return int(db.scalar(query) or 0)

    associated_users = or_(
        User.organizational_unit_id == unit.id,
        User.id.in_(select(Profile.user_id).where(Profile.organizational_unit_id == unit.id)),
    )
    return {
        "unit": {"id": unit.id, "name": unit.name, "code": unit.code, "is_active": unit.is_active},
        "users_total": int(
            db.scalar(select(func.count(distinct(User.id))).where(associated_users)) or 0
        ),
        "users_active": int(
            db.scalar(
                select(func.count(distinct(User.id))).where(
                    associated_users, User.is_active.is_(True)
                )
            )
            or 0
        ),
        "profiles_total": count(Profile, Profile.organizational_unit_id == unit.id),
        "profiles_published": count(
            Profile,
            Profile.organizational_unit_id == unit.id,
            Profile.publication_status == ProfilePublicationStatus.PUBLISHED.value,
        ),
        "profiles_draft": count(
            Profile,
            Profile.organizational_unit_id == unit.id,
            Profile.publication_status == ProfilePublicationStatus.DRAFT.value,
        ),
        "profiles_inactive": count(
            Profile,
            Profile.organizational_unit_id == unit.id,
            Profile.publication_status == ProfilePublicationStatus.INACTIVE.value,
        ),
        "courses_total": count(Course, Course.organizational_unit_id == unit.id),
        "disciplines_total": count(
            Discipline,
            Discipline.course_id.in_(
                select(Course.id).where(Course.organizational_unit_id == unit.id)
            ),
        ),
        "academic_years_open": count(
            AcademicYear,
            AcademicYear.organizational_unit_id == unit.id,
            AcademicYear.status == AcademicYearStatus.OPEN.value,
        ),
    }
