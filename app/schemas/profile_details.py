from pydantic import BaseModel, ConfigDict, Field, HttpUrl, model_validator


class EducationCreate(BaseModel):
    title_obtained: str = Field(min_length=1, max_length=120)
    course: str = Field(min_length=1, max_length=200)
    institution: str = Field(min_length=1, max_length=200)
    country: str | None = Field(default=None, max_length=100)
    completion_year: int | None = Field(default=None, ge=1800, le=2200)


class EducationUpdate(BaseModel):
    title_obtained: str | None = Field(default=None, min_length=1, max_length=120)
    course: str | None = Field(default=None, min_length=1, max_length=200)
    institution: str | None = Field(default=None, min_length=1, max_length=200)
    country: str | None = Field(default=None, max_length=100)
    completion_year: int | None = Field(default=None, ge=1800, le=2200)


class EducationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    profile_id: int
    title_obtained: str
    course: str
    institution: str
    country: str | None
    completion_year: int | None


class ResearchLineCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    description: str | None = None


class ResearchLineUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=200)
    description: str | None = None


class ResearchLineResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    profile_id: int
    title: str
    description: str | None


class PublicationCreate(BaseModel):
    title: str = Field(min_length=1, max_length=500)
    description: str | None = None
    link: HttpUrl | None = None
    type: str = Field(pattern=r"^(BOOK|ARTICLE|OTHER)$")
    citation: str | None = None
    publication_year: int | None = Field(default=None, ge=1800, le=2200)


class PublicationUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=500)
    description: str | None = None
    link: HttpUrl | None = None
    type: str | None = Field(default=None, pattern=r"^(BOOK|ARTICLE|OTHER)$")
    citation: str | None = None
    publication_year: int | None = Field(default=None, ge=1800, le=2200)


class PublicationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    profile_id: int
    title: str
    description: str | None
    link: str | None
    type: str
    citation: str | None
    publication_year: int | None


class TeachingAssignmentCreate(BaseModel):
    discipline_id: int = Field(gt=0)
    academic_year_id: int = Field(gt=0)
    semesters: list[int] = Field(min_length=1, max_length=2)

    @model_validator(mode="after")
    def semesters_are_unique_and_valid(self):
        if any(semester not in (1, 2) for semester in self.semesters):
            raise ValueError("semesters may contain only 1 and/or 2")
        if len(set(self.semesters)) != len(self.semesters):
            raise ValueError("semesters cannot contain duplicates")
        return self


class TeachingAssignmentUpdate(BaseModel):
    semesters: list[int] | None = Field(default=None, min_length=1, max_length=2)

    @model_validator(mode="after")
    def validate_semesters(self):
        if not self.model_fields_set or self.semesters is None:
            raise ValueError("semesters must be provided")
        if any(semester not in (1, 2) for semester in self.semesters):
            raise ValueError("semesters may contain only 1 and/or 2")
        if len(set(self.semesters)) != len(self.semesters):
            raise ValueError("semesters cannot contain duplicates")
        return self


class TeachingAssignmentResponse(BaseModel):
    id: int
    profile_id: int
    discipline_id: int
    academic_year_id: int
    academic_year: str
    semesters: list[int]
    discipline_name: str
    course_id: int
    course_name: str
    course_organizational_unit_id: int
    course_organizational_unit_name: str
    degree_level: str
