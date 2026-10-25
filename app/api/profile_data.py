from fastapi import APIRouter, Depends, File, HTTPException, Response, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload, selectinload

from app.api.access import commit_unique, get_manageable_profile
from app.api.deps import get_current_user
from app.core.media import (
    InvalidProfilePhoto,
    MAX_PHOTO_BYTES,
    filename_from_photo_url,
    normalize_profile_photo,
    photo_path,
    public_profile_photo_url,
    remove_profile_photo,
    store_profile_photo,
)
from app.db.session import get_db
from app.models import (
    AcademicEducation,
    AcademicYear,
    AcademicYearStatus,
    Course,
    Discipline,
    Profile,
    Publication,
    ResearchLine,
    TeachingAssignment,
    TeachingAssignmentSemester,
    User,
    UserRole,
)
from app.schemas.profile_details import (
    EducationCreate,
    EducationResponse,
    EducationUpdate,
    PublicationCreate,
    PublicationResponse,
    PublicationUpdate,
    ResearchLineCreate,
    ResearchLineResponse,
    ResearchLineUpdate,
    TeachingAssignmentCreate,
    TeachingAssignmentResponse,
    TeachingAssignmentUpdate,
)


router = APIRouter(prefix="/profiles/{profile_id}", tags=["profile details"])


@router.post("/photo")
async def upload_profile_photo(
    profile_id: int,
    file: UploadFile = File(...),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    profile = get_manageable_profile(profile_id, user, db)
    data = await file.read(MAX_PHOTO_BYTES + 1)
    try:
        normalized = normalize_profile_photo(data)
    except InvalidProfilePhoto as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    filename, path = store_profile_photo(profile.id, normalized)
    old_url = profile.photo_url
    profile.photo_url = public_profile_photo_url(profile.id, filename)
    try:
        db.commit()
        db.refresh(profile)
    except Exception:
        db.rollback()
        path.unlink(missing_ok=True)
        raise
    remove_profile_photo(profile.id, old_url)
    return {"photo_url": profile.photo_url}


@router.delete("/photo", status_code=status.HTTP_204_NO_CONTENT)
def delete_profile_photo(
    profile_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    profile = get_manageable_profile(profile_id, user, db)
    old_url = profile.photo_url
    profile.photo_url = None
    db.commit()
    remove_profile_photo(profile.id, old_url)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/photo")
def get_managed_profile_photo(
    profile_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    profile = get_manageable_profile(profile_id, user, db)
    filename = filename_from_photo_url(profile.id, profile.photo_url)
    if filename is None:
        raise HTTPException(status_code=404, detail="Profile photo not found")
    path = photo_path(profile.id, filename)
    if not path.is_file():
        raise HTTPException(status_code=404, detail="Profile photo not found")
    return FileResponse(
        path, media_type="image/webp", headers={"Cache-Control": "private, no-store"}
    )


def _reject_nulls(values: dict, required_fields: tuple[str, ...]) -> None:
    for field_name in required_fields:
        if field_name in values and values[field_name] is None:
            raise HTTPException(status_code=422, detail=f"{field_name} cannot be null")


def _owned_child(model, child_id: int, profile_id: int, db: Session):
    child = db.get(model, child_id)
    if child is None or child.profile_id != profile_id:
        raise HTTPException(status_code=404, detail="Profile data not found")
    return child


@router.get("/education", response_model=list[EducationResponse])
def list_education(
    profile_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    get_manageable_profile(profile_id, user, db)
    return list(
        db.scalars(select(AcademicEducation).where(AcademicEducation.profile_id == profile_id))
    )


@router.post("/education", response_model=EducationResponse, status_code=status.HTTP_201_CREATED)
def add_education(
    profile_id: int,
    payload: EducationCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    profile = get_manageable_profile(profile_id, user, db)
    education = AcademicEducation(profile_id=profile.id, **payload.model_dump())
    db.add(education)
    db.commit()
    db.refresh(education)
    return education


@router.patch("/education/{education_id}", response_model=EducationResponse)
def update_education(
    profile_id: int,
    education_id: int,
    payload: EducationUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    get_manageable_profile(profile_id, user, db)
    education = _owned_child(AcademicEducation, education_id, profile_id, db)
    values = payload.model_dump(exclude_unset=True)
    _reject_nulls(values, ("title_obtained", "course", "institution"))
    for key, value in values.items():
        setattr(education, key, value)
    db.commit()
    db.refresh(education)
    return education


@router.delete("/education/{education_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_education(
    profile_id: int,
    education_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    get_manageable_profile(profile_id, user, db)
    db.delete(_owned_child(AcademicEducation, education_id, profile_id, db))
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/research-lines", response_model=list[ResearchLineResponse])
def list_research_lines(
    profile_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    get_manageable_profile(profile_id, user, db)
    return list(db.scalars(select(ResearchLine).where(ResearchLine.profile_id == profile_id)))


@router.post(
    "/research-lines", response_model=ResearchLineResponse, status_code=status.HTTP_201_CREATED
)
def add_research_line(
    profile_id: int,
    payload: ResearchLineCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    profile = get_manageable_profile(profile_id, user, db)
    line = ResearchLine(profile_id=profile.id, **payload.model_dump())
    db.add(line)
    db.commit()
    db.refresh(line)
    return line


@router.patch("/research-lines/{line_id}", response_model=ResearchLineResponse)
def update_research_line(
    profile_id: int,
    line_id: int,
    payload: ResearchLineUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    get_manageable_profile(profile_id, user, db)
    line = _owned_child(ResearchLine, line_id, profile_id, db)
    values = payload.model_dump(exclude_unset=True)
    _reject_nulls(values, ("title",))
    for key, value in values.items():
        setattr(line, key, value)
    db.commit()
    db.refresh(line)
    return line


@router.delete("/research-lines/{line_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_research_line(
    profile_id: int,
    line_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    get_manageable_profile(profile_id, user, db)
    db.delete(_owned_child(ResearchLine, line_id, profile_id, db))
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/publications", response_model=list[PublicationResponse])
def list_publications(
    profile_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    get_manageable_profile(profile_id, user, db)
    return list(db.scalars(select(Publication).where(Publication.profile_id == profile_id)))


@router.post(
    "/publications", response_model=PublicationResponse, status_code=status.HTTP_201_CREATED
)
def add_publication(
    profile_id: int,
    payload: PublicationCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    profile = get_manageable_profile(profile_id, user, db)
    publication = Publication(profile_id=profile.id, **payload.model_dump(mode="json"))
    db.add(publication)
    db.commit()
    db.refresh(publication)
    return publication


@router.patch("/publications/{publication_id}", response_model=PublicationResponse)
def update_publication(
    profile_id: int,
    publication_id: int,
    payload: PublicationUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    get_manageable_profile(profile_id, user, db)
    publication = _owned_child(Publication, publication_id, profile_id, db)
    values = payload.model_dump(exclude_unset=True, mode="json")
    _reject_nulls(values, ("title", "type"))
    for key, value in values.items():
        setattr(publication, key, value)
    db.commit()
    db.refresh(publication)
    return publication


@router.delete("/publications/{publication_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_publication(
    profile_id: int,
    publication_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    get_manageable_profile(profile_id, user, db)
    db.delete(_owned_child(Publication, publication_id, profile_id, db))
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


def _assignment_response(assignment: TeachingAssignment) -> TeachingAssignmentResponse:
    return TeachingAssignmentResponse(
        id=assignment.id,
        profile_id=assignment.profile_id,
        discipline_id=assignment.discipline_id,
        academic_year_id=assignment.academic_year_id,
        academic_year=assignment.academic_year.label,
        semesters=[item.semester for item in assignment.semesters],
        discipline_name=assignment.discipline.name,
        course_id=assignment.discipline.course_id,
        course_name=assignment.discipline.course.name,
        course_organizational_unit_id=assignment.discipline.course.organizational_unit_id,
        course_organizational_unit_name=assignment.discipline.course.organizational_unit.name,
        degree_level=assignment.discipline.course.degree_level,
    )


def _lock_open_academic_year(year_id: int, db: Session) -> AcademicYear:
    year = db.scalar(select(AcademicYear).where(AcademicYear.id == year_id).with_for_update())
    if year is None:
        raise HTTPException(status_code=404, detail="Academic year not found")
    if year.status != AcademicYearStatus.OPEN.value:
        raise HTTPException(status_code=409, detail="The academic year is closed")
    return year


@router.get("/disciplines", response_model=list[TeachingAssignmentResponse])
def list_profile_disciplines(
    profile_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    get_manageable_profile(profile_id, user, db)
    query = (
        select(TeachingAssignment)
        .where(TeachingAssignment.profile_id == profile_id)
        .join(AcademicYear, AcademicYear.id == TeachingAssignment.academic_year_id)
        .options(
            joinedload(TeachingAssignment.academic_year),
            joinedload(TeachingAssignment.discipline)
            .joinedload(Discipline.course)
            .joinedload(Course.organizational_unit),
            selectinload(TeachingAssignment.semesters),
        )
        .order_by(AcademicYear.label.desc(), TeachingAssignment.discipline_id)
    )
    return [_assignment_response(item) for item in db.scalars(query)]


@router.post(
    "/disciplines", response_model=TeachingAssignmentResponse, status_code=status.HTTP_201_CREATED
)
def add_profile_discipline(
    profile_id: int,
    payload: TeachingAssignmentCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    profile = get_manageable_profile(profile_id, user, db)
    if profile.main_function != "DOCENTE":
        raise HTTPException(
            status_code=422, detail="Only DOCENTE profiles can be assigned disciplines"
        )
    discipline = db.get(Discipline, payload.discipline_id)
    if (
        discipline is None
        or not discipline.is_active
        or not discipline.course.is_active
        or not discipline.course.organizational_unit.is_active
    ):
        raise HTTPException(status_code=404, detail="Active discipline not found")
    year = _lock_open_academic_year(payload.academic_year_id, db)
    if year.organizational_unit_id != discipline.course.organizational_unit_id:
        raise HTTPException(
            status_code=422,
            detail="Academic year must belong to the discipline's organizational unit",
        )
    if user.role == UserRole.UNIT_ADMIN.value:
        if discipline.course.organizational_unit_id != user.organizational_unit_id:
            raise HTTPException(
                status_code=403, detail="Not allowed to manage another unit's course"
            )

    assignment = TeachingAssignment(
        profile_id=profile.id,
        discipline_id=discipline.id,
        academic_year_id=year.id,
        semesters=[
            TeachingAssignmentSemester(semester=semester) for semester in sorted(payload.semesters)
        ],
    )
    db.add(assignment)
    commit_unique(db, "This discipline already has a teacher for that academic year")
    db.refresh(assignment)
    db.refresh(assignment, attribute_names=["academic_year", "discipline", "semesters"])
    return _assignment_response(assignment)


@router.delete("/disciplines/{assignment_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_profile_discipline(
    profile_id: int,
    assignment_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    get_manageable_profile(profile_id, user, db)
    assignment = _owned_child(TeachingAssignment, assignment_id, profile_id, db)
    _lock_open_academic_year(assignment.academic_year_id, db)
    if user.role == UserRole.UNIT_ADMIN.value:
        course_unit_id = assignment.discipline.course.organizational_unit_id
        if course_unit_id != user.organizational_unit_id:
            raise HTTPException(
                status_code=403, detail="Not allowed to manage another unit's course"
            )
    db.delete(assignment)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.patch("/disciplines/{assignment_id}", response_model=TeachingAssignmentResponse)
def update_profile_discipline(
    profile_id: int,
    assignment_id: int,
    payload: TeachingAssignmentUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    profile = get_manageable_profile(profile_id, user, db)
    if profile.main_function != "DOCENTE":
        raise HTTPException(
            status_code=422, detail="Only DOCENTE profiles can have discipline assignments"
        )
    assignment = _owned_child(TeachingAssignment, assignment_id, profile_id, db)
    _lock_open_academic_year(assignment.academic_year_id, db)
    if user.role == UserRole.UNIT_ADMIN.value:
        course_unit_id = assignment.discipline.course.organizational_unit_id
        if course_unit_id != user.organizational_unit_id:
            raise HTTPException(
                status_code=403, detail="Not allowed to manage another unit's course"
            )
    desired_semesters = set(payload.semesters)
    existing_semesters = {item.semester for item in assignment.semesters}
    assignment.semesters[:] = [
        item for item in assignment.semesters if item.semester in desired_semesters
    ]
    assignment.semesters.extend(
        TeachingAssignmentSemester(semester=semester)
        for semester in sorted(desired_semesters - existing_semesters)
    )
    db.commit()
    db.refresh(assignment)
    db.refresh(assignment, attribute_names=["academic_year", "discipline", "semesters"])
    return _assignment_response(assignment)
