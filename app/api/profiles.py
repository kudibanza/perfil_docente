from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.api.access import commit_unique, get_manageable_profile
from app.api.deps import assert_unit_access, get_current_user
from app.db.session import get_db
from app.models import OrganizationalUnit, Profile, ProfileCategory, User, UserRole
from app.schemas.profiles import (
    ProfileAdminCreate,
    ProfileResponse,
    ProfileSelfCreate,
    ProfileUpdate,
)


router = APIRouter(prefix="/profiles", tags=["profiles"])


def _check_category(main_function: str, category: str) -> None:
    allowed = {
        "DOCENTE": {
            "ASSISTENTE_ESTAGIARIO",
            "ASSISTENTE",
            "PROFESSOR_AUXILIAR",
            "PROFESSOR_ASSOCIADO",
            "PROFESSOR_CATEDRATICO",
        },
        "INVESTIGADOR": {
            "ESTAGIARIO_INVESTIGACAO",
            "ASSISTENTE_INVESTIGACAO",
            "INVESTIGADOR_AUXILIAR",
            "INVESTIGADOR_PRINCIPAL",
        },
        "FUNCIONARIO_ADMINISTRATIVO": {"TECNICO_SUPERIOR", "TECNICO_MEDIO", "TECNICO_BASE"},
    }
    if category not in allowed.get(main_function, set()):
        raise HTTPException(status_code=422, detail="Category is not valid for main_function")


@router.get("/me", response_model=ProfileResponse)
def my_profile(user: User = Depends(get_current_user)) -> Profile:
    if user.profile is None:
        raise HTTPException(status_code=404, detail="Profile not found")
    return user.profile


@router.post("/me", response_model=ProfileResponse, status_code=status.HTTP_201_CREATED)
def create_my_profile(
    payload: ProfileSelfCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Profile:
    if user.role != UserRole.USER.value:
        raise HTTPException(status_code=403, detail="This endpoint is for USER accounts")
    if user.profile is not None:
        raise HTTPException(status_code=409, detail="This user already has a profile")
    unit = db.get(OrganizationalUnit, payload.organizational_unit_id)
    if unit is None or not unit.is_active:
        raise HTTPException(status_code=404, detail="Active organizational unit not found")

    fields = payload.model_dump(exclude={"organizational_unit_id"}, mode="json")
    profile = Profile(
        user_id=user.id,
        organizational_unit_id=payload.organizational_unit_id,
        publication_status="DRAFT",
        **fields,
    )
    db.add(profile)
    commit_unique(db, "A profile with this user or slug already exists")
    db.refresh(profile)
    return profile


@router.post("", response_model=ProfileResponse, status_code=status.HTTP_201_CREATED)
def create_profile(
    payload: ProfileAdminCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Profile:
    if user.role not in {UserRole.UNIT_ADMIN.value, UserRole.SUPER_ADMIN.value}:
        raise HTTPException(status_code=403, detail="Only administrators can create profiles")
    assert_unit_access(user, payload.organizational_unit_id)

    account = db.get(User, payload.user_id)
    if account is None:
        raise HTTPException(status_code=404, detail="User account not found")
    if account.profile is not None:
        raise HTTPException(status_code=409, detail="This user already has a profile")
    unit = db.get(OrganizationalUnit, payload.organizational_unit_id)
    if unit is None or not unit.is_active:
        raise HTTPException(status_code=404, detail="Active organizational unit not found")

    fields = payload.model_dump(exclude={"user_id", "organizational_unit_id"}, mode="json")
    profile = Profile(
        user_id=payload.user_id,
        organizational_unit_id=payload.organizational_unit_id,
        **fields,
    )
    db.add(profile)
    commit_unique(db, "A profile with this user or slug already exists")
    db.refresh(profile)
    return profile


@router.get("", response_model=list[ProfileResponse])
def list_managed_profiles(
    organizational_unit_id: int | None = Query(default=None, gt=0),
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[Profile]:
    if user.role == UserRole.SUPER_ADMIN.value:
        query = select(Profile)
        if organizational_unit_id is not None:
            query = query.where(Profile.organizational_unit_id == organizational_unit_id)
    elif user.role == UserRole.UNIT_ADMIN.value:
        if organizational_unit_id is not None:
            assert_unit_access(user, organizational_unit_id)
        query = select(Profile).where(Profile.organizational_unit_id == user.organizational_unit_id)
    elif user.role == UserRole.USER.value:
        raise HTTPException(status_code=403, detail="Use /profiles/me to access your profile")
    else:
        raise HTTPException(status_code=403, detail="Not allowed")
    return list(db.scalars(query.order_by(Profile.full_name).offset(offset).limit(limit)))


@router.get("/{profile_id}", response_model=ProfileResponse)
def get_profile(
    profile_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Profile:
    return get_manageable_profile(profile_id, user, db)


@router.patch("/{profile_id}", response_model=ProfileResponse)
def update_profile(
    profile_id: int,
    payload: ProfileUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Profile:
    profile = get_manageable_profile(profile_id, user, db)
    values = payload.model_dump(exclude_unset=True, mode="json")
    if user.role == UserRole.USER.value and "publication_status" in values:
        raise HTTPException(
            status_code=403, detail="Only administrators can change publication status"
        )
    if "organizational_unit_id" in values:
        if user.role != UserRole.SUPER_ADMIN.value:
            raise HTTPException(
                status_code=403, detail="Only SUPER_ADMIN can transfer a profile to another unit"
            )
        if profile.user.role != UserRole.USER.value:
            raise HTTPException(
                status_code=422, detail="Only USER profiles can be transferred this way"
            )
        unit = db.get(OrganizationalUnit, values["organizational_unit_id"])
        if unit is None or not unit.is_active:
            raise HTTPException(status_code=404, detail="Active organizational unit not found")

    main_function = values.get("main_function", profile.main_function)
    category = values.get("category", profile.category)
    _check_category(main_function, category)

    for key, value in values.items():
        setattr(profile, key, value)
    commit_unique(db, "The profile slug is already in use")
    db.refresh(profile)
    return profile
