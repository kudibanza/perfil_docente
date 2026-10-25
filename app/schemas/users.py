from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from app.models.enums import UserPermissionCode, UserRole


class UserCreate(BaseModel):
    email: str = Field(min_length=3, max_length=320, pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
    password: str = Field(min_length=12, max_length=1024)
    role: UserRole
    organizational_unit_id: int | None = Field(default=None, gt=0)
    permissions: list[UserPermissionCode] = Field(default_factory=list)

    @model_validator(mode="after")
    def unit_matches_role(self):
        if (self.role == UserRole.UNIT_ADMIN) != (self.organizational_unit_id is not None):
            raise ValueError("Only UNIT_ADMIN accounts must have an organizational_unit_id")
        if self.permissions and self.role != UserRole.UNIT_ADMIN:
            raise ValueError("Only UNIT_ADMIN accounts can receive these permissions")
        return self


class UserUpdate(BaseModel):
    email: str | None = Field(
        default=None, min_length=3, max_length=320, pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$"
    )
    new_password: str | None = Field(default=None, min_length=12, max_length=1024)
    role: UserRole | None = None
    organizational_unit_id: int | None = Field(default=None, gt=0)
    is_active: bool | None = None
    permissions: list[UserPermissionCode] | None = None

    @model_validator(mode="after")
    def non_null_required_updates(self):
        for field_name in ("email", "new_password", "role", "is_active"):
            if field_name in self.model_fields_set and getattr(self, field_name) is None:
                raise ValueError(f"{field_name} cannot be null")
        if "permissions" in self.model_fields_set and self.permissions is None:
            raise ValueError(
                "permissions cannot be null; use an empty list to revoke all permissions"
            )
        if self.permissions and self.role is not None and self.role != UserRole.UNIT_ADMIN:
            raise ValueError("Only UNIT_ADMIN accounts can receive these permissions")
        return self


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: str
    role: UserRole
    organizational_unit_id: int | None
    profile_id: int | None = None
    profile_organizational_unit_id: int | None = None
    is_active: bool
    email_verified_at: datetime | None
    last_login_at: datetime | None
    permissions: list[UserPermissionCode] = Field(default_factory=list)

    @field_validator("permissions", mode="before")
    @classmethod
    def read_permission_grants(cls, value):
        if isinstance(value, (list, tuple)):
            return [getattr(grant, "code", grant) for grant in value]
        return value
