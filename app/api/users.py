from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.api.access import commit_unique
from app.api.deps import get_current_user
from app.core.security import hash_password
from app.db.session import get_db
from app.models import (
    OrganizationalUnit,
    Profile,
    User,
    UserPermissionCode,
    UserPermissionGrant,
    UserRole,
)
from app.schemas.users import UserCreate, UserResponse, UserUpdate


router = APIRouter(prefix="/users", tags=["user administration"])


def _require_super_admin(user: User) -> None:
    if user.role != UserRole.SUPER_ADMIN.value:
        raise HTTPException(status_code=403, detail="Only SUPER_ADMIN can manage user accounts")


def _validate_role_unit(role: UserRole | str, unit_id: int | None) -> None:
    role_value = role.value if isinstance(role, UserRole) else role
    if (role_value == UserRole.UNIT_ADMIN.value) != (unit_id is not None):
        raise HTTPException(
            status_code=422,
            detail="UNIT_ADMIN accounts require an organizational unit; other roles must not have one",
        )


def _permissions(user: User) -> set[str]:
    return {grant.code for grant in user.permissions}


def _validate_permissions(role: str, permissions: list[UserPermissionCode]) -> None:
    if permissions and role != UserRole.UNIT_ADMIN.value:
        raise HTTPException(
            status_code=422, detail="Only UNIT_ADMIN accounts can receive these permissions"
        )


def _protect_last_super_admin(db: Session, target: User, role: str, is_active: bool) -> None:
    is_removing_active_super = (
        target.role == UserRole.SUPER_ADMIN.value
        and target.is_active
        and (role != UserRole.SUPER_ADMIN.value or not is_active)
    )
    if not is_removing_active_super:
        return
    active_count = db.scalar(
        select(func.count(User.id)).where(
            User.role == UserRole.SUPER_ADMIN.value,
            User.is_active.is_(True),
        )
    )
    if active_count is not None and active_count <= 1:
        raise HTTPException(
            status_code=409, detail="Cannot disable or demote the last active SUPER_ADMIN"
        )


@router.get("", response_model=list[UserResponse])
def list_users(
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if user.role == UserRole.SUPER_ADMIN.value:
        query = select(User)
    elif (
        user.role == UserRole.UNIT_ADMIN.value
        and UserPermissionCode.CREATE_USER_ACCOUNT.value in _permissions(user)
    ):
        query = (
            select(User)
            .join(Profile, Profile.user_id == User.id)
            .where(Profile.organizational_unit_id == user.organizational_unit_id)
        )
    else:
        raise HTTPException(status_code=403, detail="Not allowed to list user accounts")
    query = (
        query.options(selectinload(User.profile)).order_by(User.email).offset(offset).limit(limit)
    )
    return list(db.scalars(query))


@router.post("", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def create_user(
    payload: UserCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if user.role == UserRole.SUPER_ADMIN.value:
        pass
    elif user.role == UserRole.UNIT_ADMIN.value:
        if UserPermissionCode.CREATE_USER_ACCOUNT.value not in _permissions(user):
            raise HTTPException(
                status_code=403, detail="You do not have permission to create user accounts"
            )
        if payload.role != UserRole.USER:
            raise HTTPException(status_code=403, detail="UNIT_ADMIN can only create USER accounts")
    else:
        raise HTTPException(status_code=403, detail="Only administrators can create user accounts")
    _validate_role_unit(payload.role, payload.organizational_unit_id)
    _validate_permissions(payload.role.value, payload.permissions)
    if payload.organizational_unit_id is not None:
        unit = db.get(OrganizationalUnit, payload.organizational_unit_id)
        if unit is None or not unit.is_active:
            raise HTTPException(status_code=404, detail="Active organizational unit not found")
    account = User(
        email=payload.email.strip().lower(),
        password_hash=hash_password(payload.password),
        role=payload.role.value,
        organizational_unit_id=payload.organizational_unit_id,
        is_active=True,
        permissions=[
            UserPermissionGrant(code=permission.value) for permission in payload.permissions
        ],
    )
    db.add(account)
    commit_unique(db, "An account with this email already exists")
    db.refresh(account)
    return account


@router.get("/{user_id}", response_model=UserResponse)
def get_user(
    user_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _require_super_admin(user)
    account = db.get(User, user_id)
    if account is None:
        raise HTTPException(status_code=404, detail="User not found")
    return account


@router.patch("/{user_id}", response_model=UserResponse)
def update_user(
    user_id: int,
    payload: UserUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _require_super_admin(user)
    account = db.get(User, user_id)
    if account is None:
        raise HTTPException(status_code=404, detail="User not found")

    values = payload.model_dump(exclude_unset=True)
    requested_permissions = values.pop("permissions", None)
    new_role = values.get("role", account.role)
    if isinstance(new_role, UserRole):
        new_role = new_role.value
    role_changed = new_role != account.role
    new_unit_id = values.get("organizational_unit_id", account.organizational_unit_id)
    new_is_active = values.get("is_active", account.is_active)
    _validate_role_unit(new_role, new_unit_id)
    permission_codes = (
        requested_permissions if requested_permissions is not None else _permissions(account)
    )
    if new_role != UserRole.UNIT_ADMIN.value and requested_permissions is None:
        permission_codes = set()
    permission_codes = [
        code if isinstance(code, UserPermissionCode) else UserPermissionCode(code)
        for code in permission_codes
    ]
    _validate_permissions(new_role, permission_codes)
    if new_unit_id is not None:
        unit = db.get(OrganizationalUnit, new_unit_id)
        if unit is None or not unit.is_active:
            raise HTTPException(status_code=404, detail="Active organizational unit not found")
    _protect_last_super_admin(db, account, new_role, new_is_active)

    for key, value in values.items():
        if key == "new_password":
            account.password_hash = hash_password(value)
        elif key == "email":
            account.email = value.strip().lower()
        elif key == "role":
            account.role = new_role
        else:
            setattr(account, key, value)
    if requested_permissions is not None or role_changed:
        account.permissions = [
            UserPermissionGrant(code=permission.value) for permission in permission_codes
        ]
    commit_unique(db, "An account with this email already exists")
    db.refresh(account)
    return account


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def deactivate_user(
    user_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _require_super_admin(user)
    account = db.get(User, user_id)
    if account is None:
        raise HTTPException(status_code=404, detail="User not found")
    _protect_last_super_admin(db, account, account.role, False)
    account.is_active = False
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
