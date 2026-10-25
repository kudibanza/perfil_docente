from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.access import commit_unique, get_visible_course
from app.api.deps import assert_unit_access, get_current_user
from app.db.session import get_db
from app.models import Course, Discipline, OrganizationalUnit, User, UserRole
from app.schemas.catalog import (
    CourseCreate,
    CourseResponse,
    CourseUpdate,
    DisciplineCreate,
    DisciplineResponse,
    DisciplineUpdate,
)


router = APIRouter(tags=["courses and disciplines"])


def _admin_only(user: User) -> None:
    if user.role not in {UserRole.UNIT_ADMIN.value, UserRole.SUPER_ADMIN.value}:
        raise HTTPException(status_code=403, detail="Only administrators can manage the catalog")


@router.get("/courses", response_model=list[CourseResponse])
def list_courses(
    organizational_unit_id: int | None = Query(default=None, gt=0),
    include_inactive: bool = False,
    limit: int = Query(default=100, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = select(Course)
    if user.role == UserRole.SUPER_ADMIN.value:
        if organizational_unit_id is not None:
            query = query.where(Course.organizational_unit_id == organizational_unit_id)
    elif user.role == UserRole.UNIT_ADMIN.value:
        if organizational_unit_id is not None:
            assert_unit_access(user, organizational_unit_id)
        query = query.where(Course.organizational_unit_id == user.organizational_unit_id)
    elif user.role == UserRole.USER.value:
        if include_inactive:
            raise HTTPException(
                status_code=403, detail="Inactive courses are only visible to administrators"
            )
        if user.profile is None:
            return []
        if user.profile.main_function != "DOCENTE":
            return []
        query = query.join(
            OrganizationalUnit,
            Course.organizational_unit_id == OrganizationalUnit.id,
        ).where(OrganizationalUnit.is_active.is_(True))
        if organizational_unit_id is not None:
            query = query.where(Course.organizational_unit_id == organizational_unit_id)
    else:
        raise HTTPException(status_code=403, detail="Not allowed")

    if not include_inactive:
        query = query.where(Course.is_active.is_(True))
    query = query.order_by(Course.name).offset(offset).limit(limit)
    return list(db.scalars(query))


@router.post("/courses", response_model=CourseResponse, status_code=status.HTTP_201_CREATED)
def create_course(
    payload: CourseCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _admin_only(user)
    assert_unit_access(user, payload.organizational_unit_id)
    unit = db.get(OrganizationalUnit, payload.organizational_unit_id)
    if unit is None or not unit.is_active:
        raise HTTPException(status_code=404, detail="Active organizational unit not found")
    course = Course(**payload.model_dump(mode="json"))
    db.add(course)
    commit_unique(db, "A course with this code already exists in the unit")
    db.refresh(course)
    return course


@router.get("/courses/{course_id}", response_model=CourseResponse)
def get_course(
    course_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return get_visible_course(course_id, user, db)


@router.patch("/courses/{course_id}", response_model=CourseResponse)
def update_course(
    course_id: int,
    payload: CourseUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _admin_only(user)
    course = get_visible_course(course_id, user, db)
    values = payload.model_dump(exclude_unset=True, mode="json")
    for required in ("name", "code", "degree_level", "is_active"):
        if required in values and values[required] is None:
            raise HTTPException(status_code=422, detail=f"{required} cannot be null")
    for key, value in values.items():
        setattr(course, key, value)
    commit_unique(db, "A course with this code already exists in the unit")
    db.refresh(course)
    return course


@router.delete("/courses/{course_id}", status_code=status.HTTP_204_NO_CONTENT)
def deactivate_course(
    course_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _admin_only(user)
    course = get_visible_course(course_id, user, db)
    course.is_active = False
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/courses/{course_id}/disciplines", response_model=list[DisciplineResponse])
def list_disciplines(
    course_id: int,
    include_inactive: bool = False,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    get_visible_course(course_id, user, db)
    if include_inactive and user.role == UserRole.USER.value:
        raise HTTPException(
            status_code=403, detail="Inactive disciplines are only visible to administrators"
        )
    query = select(Discipline).where(Discipline.course_id == course_id)
    if not include_inactive:
        query = query.where(Discipline.is_active.is_(True))
    return list(db.scalars(query.order_by(Discipline.curricular_year, Discipline.name)))


@router.post(
    "/courses/{course_id}/disciplines",
    response_model=DisciplineResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_discipline(
    course_id: int,
    payload: DisciplineCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _admin_only(user)
    course = get_visible_course(course_id, user, db)
    if not course.is_active:
        raise HTTPException(status_code=409, detail="Cannot add disciplines to an inactive course")
    discipline = Discipline(course_id=course.id, **payload.model_dump())
    db.add(discipline)
    commit_unique(db, "A discipline with this code already exists in the course")
    db.refresh(discipline)
    return discipline


@router.patch("/disciplines/{discipline_id}", response_model=DisciplineResponse)
def update_discipline(
    discipline_id: int,
    payload: DisciplineUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _admin_only(user)
    discipline = db.get(Discipline, discipline_id)
    if discipline is None:
        raise HTTPException(status_code=404, detail="Discipline not found")
    get_visible_course(discipline.course_id, user, db)
    values = payload.model_dump(exclude_unset=True)
    for required in ("name", "code", "curricular_year", "is_active"):
        if required in values and values[required] is None:
            raise HTTPException(status_code=422, detail=f"{required} cannot be null")
    for key, value in values.items():
        setattr(discipline, key, value)
    commit_unique(db, "A discipline with this code already exists in the course")
    db.refresh(discipline)
    return discipline


@router.delete("/disciplines/{discipline_id}", status_code=status.HTTP_204_NO_CONTENT)
def deactivate_discipline(
    discipline_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _admin_only(user)
    discipline = db.get(Discipline, discipline_id)
    if discipline is None:
        raise HTTPException(status_code=404, detail="Discipline not found")
    get_visible_course(discipline.course_id, user, db)
    discipline.is_active = False
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
