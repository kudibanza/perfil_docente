from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import DegreeLevel


class CourseCreate(BaseModel):
    organizational_unit_id: int = Field(gt=0)
    name: str = Field(min_length=2, max_length=200)
    code: str = Field(min_length=1, max_length=40)
    description: str | None = None
    degree_level: DegreeLevel


class CourseUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=200)
    code: str | None = Field(default=None, min_length=1, max_length=40)
    description: str | None = None
    degree_level: DegreeLevel | None = None
    is_active: bool | None = None


class CourseResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    organizational_unit_id: int
    name: str
    code: str
    description: str | None
    degree_level: DegreeLevel
    is_active: bool


class DisciplineCreate(BaseModel):
    name: str = Field(min_length=2, max_length=200)
    code: str = Field(min_length=1, max_length=40)
    description: str | None = None
    curricular_year: int = Field(ge=1, le=255)


class DisciplineUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=200)
    code: str | None = Field(default=None, min_length=1, max_length=40)
    description: str | None = None
    curricular_year: int | None = Field(default=None, ge=1, le=255)
    is_active: bool | None = None


class DisciplineResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    course_id: int
    name: str
    code: str
    description: str | None
    curricular_year: int
    is_active: bool
