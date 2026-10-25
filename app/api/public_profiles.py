from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.db.session import get_db
from app.api.access import get_manageable_profile
from app.api.deps import get_optional_current_user
from app.core.media import filename_from_photo_url, photo_path
from app.models import (
    AcademicYear,
    AcademicEducation,
    Course,
    Discipline,
    Profile,
    Publication,
    ResearchLine,
    TeachingAssignment,
    User,
)
from app.schemas.profile_details import EducationResponse, PublicationResponse, ResearchLineResponse
from app.schemas.profiles import PublicProfileResponse


router = APIRouter(prefix="/public/profiles", tags=["public profiles"])
photo_router = APIRouter(prefix="/public/profile-photos", tags=["public profiles"])


class PublicTeachingAssignment(BaseModel):
    academic_year_id: int
    academic_year: str
    semesters: list[int]
    discipline_name: str
    discipline_code: str
    curricular_year: int
    course_name: str
    course_code: str
    course_organizational_unit_name: str
    degree_level: str


class PublicProfileDetail(PublicProfileResponse):
    academic_education: list[EducationResponse]
    research_lines: list[ResearchLineResponse]
    publications: list[PublicationResponse]
    disciplines: list[str] = Field(default_factory=list)
    current_academic_year: str | None = None
    teaching_assignments: list[PublicTeachingAssignment] = Field(default_factory=list)


def _published_profile_query():
    return (
        select(Profile)
        .join(User, User.id == Profile.user_id)
        .where(Profile.publication_status == "PUBLISHED", User.is_active.is_(True))
    )


@photo_router.get("/{profile_id}/{filename}", include_in_schema=False)
def get_profile_photo(
    profile_id: int,
    filename: str,
    user: User | None = Depends(get_optional_current_user),
    db: Session = Depends(get_db),
):
    profile = db.get(Profile, profile_id)
    if profile is None or filename_from_photo_url(profile.id, profile.photo_url) != filename:
        raise HTTPException(status_code=404, detail="Profile photo not found")
    is_public = profile.publication_status == "PUBLISHED" and profile.user.is_active
    if not is_public:
        if user is None:
            raise HTTPException(status_code=404, detail="Profile photo not found")
        get_manageable_profile(profile.id, user, db)
    path = photo_path(profile.id, filename)
    if not path.is_file():
        raise HTTPException(status_code=404, detail="Profile photo not found")
    return FileResponse(
        path, media_type="image/webp", headers={"Cache-Control": "private, no-store"}
    )


@router.get("", response_model=list[PublicProfileResponse])
def list_public_profiles(
    q: str | None = Query(default=None, max_length=200),
    organizational_unit_id: int | None = Query(default=None, gt=0),
    main_function: str | None = Query(
        default=None, pattern="^(DOCENTE|INVESTIGADOR|FUNCIONARIO_ADMINISTRATIVO)$"
    ),
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
) -> list[Profile]:
    query = _published_profile_query()
    if q:
        query = query.where(Profile.full_name.ilike(f"%{q.strip()}%"))
    if organizational_unit_id is not None:
        query = query.where(Profile.organizational_unit_id == organizational_unit_id)
    if main_function:
        query = query.where(Profile.main_function == main_function)
    query = query.order_by(Profile.full_name).offset(offset).limit(limit)
    return list(db.scalars(query))


@router.get("/{slug}", response_model=PublicProfileDetail)
def get_public_profile(slug: str, db: Session = Depends(get_db)) -> PublicProfileDetail:
    query = (
        _published_profile_query()
        .where(Profile.slug == slug)
        .options(
            selectinload(Profile.academic_education),
            selectinload(Profile.research_lines),
            selectinload(Profile.publications),
            selectinload(Profile.teaching_assignments).selectinload(TeachingAssignment.semesters),
            selectinload(Profile.teaching_assignments).selectinload(
                TeachingAssignment.academic_year
            ),
            selectinload(Profile.teaching_assignments)
            .selectinload(TeachingAssignment.discipline)
            .selectinload(Discipline.course)
            .selectinload(Course.organizational_unit),
        )
    )
    profile = db.scalar(query)
    if profile is None:
        raise HTTPException(status_code=404, detail="Published profile not found")
    current_year = db.scalar(
        select(AcademicYear.label)
        .where(
            AcademicYear.organizational_unit_id == profile.organizational_unit_id,
            AcademicYear.status == "OPEN",
        )
        .order_by(AcademicYear.label.desc())
        .limit(1)
    )
    result = PublicProfileDetail(
        **PublicProfileResponse.model_validate(profile).model_dump(),
        academic_education=profile.academic_education,
        research_lines=profile.research_lines,
        publications=profile.publications,
        current_academic_year=current_year,
    )
    assignments = list(profile.teaching_assignments)
    if current_year:
        current_start = int(current_year[:4])
        assignments = [
            assignment
            for assignment in assignments
            if current_start - 2 <= int(assignment.academic_year.label[:4]) <= current_start
        ]
    else:
        assignments = []
    assignments.sort(
        key=lambda item: (
            item.academic_year.label,
            max((semester.semester for semester in item.semesters), default=0),
        ),
        reverse=True,
    )
    result.disciplines = list(
        dict.fromkeys(assignment.discipline.name for assignment in assignments)
    )
    result.teaching_assignments = [
        PublicTeachingAssignment(
            academic_year_id=assignment.academic_year_id,
            academic_year=assignment.academic_year.label,
            semesters=[semester.semester for semester in assignment.semesters],
            discipline_name=assignment.discipline.name,
            discipline_code=assignment.discipline.code,
            curricular_year=assignment.discipline.curricular_year,
            course_name=assignment.discipline.course.name,
            course_code=assignment.discipline.course.code,
            course_organizational_unit_name=assignment.discipline.course.organizational_unit.name,
            degree_level=assignment.discipline.course.degree_level,
        )
        for assignment in assignments
    ]
    return result
