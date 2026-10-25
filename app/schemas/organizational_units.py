from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, model_validator


class OrganizationalUnitCreate(BaseModel):
    name: str = Field(min_length=2, max_length=200)
    code: str = Field(min_length=2, max_length=40, pattern=r"^[A-Za-z0-9_-]+$")
    description: str | None = None


class OrganizationalUnitUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=200)
    code: str | None = Field(default=None, min_length=2, max_length=40, pattern=r"^[A-Za-z0-9_-]+$")
    description: str | None = None
    is_active: bool | None = None

    @model_validator(mode="after")
    def required_values_cannot_be_cleared(self):
        for field_name in ("name", "code", "is_active"):
            if field_name in self.model_fields_set and getattr(self, field_name) is None:
                raise ValueError(f"{field_name} cannot be null")
        return self


class OrganizationalUnitResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    code: str
    description: str | None
    is_active: bool
    created_at: datetime
    updated_at: datetime
