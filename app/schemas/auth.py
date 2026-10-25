from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.models.enums import UserPermissionCode


class LoginRequest(BaseModel):
    email: str = Field(min_length=3, max_length=320)
    password: str = Field(min_length=1, max_length=1024)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int


class AuthenticatedUser(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: str
    role: str
    organizational_unit_id: int | None
    is_active: bool
    permissions: list[UserPermissionCode] = Field(default_factory=list)

    @field_validator("permissions", mode="before")
    @classmethod
    def read_permission_grants(cls, value):
        if isinstance(value, (list, tuple)):
            return [getattr(grant, "code", grant) for grant in value]
        return value
