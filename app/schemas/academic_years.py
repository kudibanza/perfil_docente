from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.models.enums import AcademicYearStatus


def validate_academic_year_label(value: str) -> str:
    start, end = value.split("/")
    if int(end) != int(start) + 1:
        raise ValueError("label must contain consecutive years, for example 2022/2023")
    return value


class AcademicYearCreate(BaseModel):
    label: str = Field(pattern=r"^\d{4}/\d{4}$", min_length=9, max_length=9)
    organizational_unit_id: int | None = Field(default=None, gt=0)

    @field_validator("label")
    @classmethod
    def validate_consecutive_years(cls, value: str) -> str:
        return validate_academic_year_label(value)


class AcademicYearResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    organizational_unit_id: int
    label: str
    status: AcademicYearStatus
    opened_at: datetime | None
    opened_by_user_id: int | None
    closed_at: datetime | None
    closed_by_user_id: int | None
