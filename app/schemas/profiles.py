from pydantic import BaseModel, ConfigDict, Field, HttpUrl, model_validator

from app.models.enums import (
    MainFunction,
    ProfileCategory,
    ProfilePosition,
    ProfilePublicationStatus,
)


class ProfileFields(BaseModel):
    slug: str = Field(min_length=2, max_length=180, pattern=r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
    full_name: str = Field(min_length=2, max_length=200)
    photo_url: HttpUrl | None = None
    email: str | None = Field(default=None, max_length=320)
    orcid_url: HttpUrl | None = None
    linkedin_url: HttpUrl | None = None
    github_url: HttpUrl | None = None
    google_scholar_url: HttpUrl | None = None
    main_function: MainFunction
    category: ProfileCategory
    position: ProfilePosition | None = None
    area_of_activity: str | None = None

    @model_validator(mode="after")
    def category_matches_function(self):
        categories = {
            MainFunction.DOCENTE: {
                ProfileCategory.ASSISTENTE_ESTAGIARIO,
                ProfileCategory.ASSISTENTE,
                ProfileCategory.PROFESSOR_AUXILIAR,
                ProfileCategory.PROFESSOR_ASSOCIADO,
                ProfileCategory.PROFESSOR_CATEDRATICO,
            },
            MainFunction.INVESTIGADOR: {
                ProfileCategory.ESTAGIARIO_INVESTIGACAO,
                ProfileCategory.ASSISTENTE_INVESTIGACAO,
                ProfileCategory.INVESTIGADOR_AUXILIAR,
                ProfileCategory.INVESTIGADOR_PRINCIPAL,
            },
            MainFunction.FUNCIONARIO_ADMINISTRATIVO: {
                ProfileCategory.TECNICO_SUPERIOR,
                ProfileCategory.TECNICO_MEDIO,
                ProfileCategory.TECNICO_BASE,
            },
        }
        if self.category not in categories[self.main_function]:
            raise ValueError("category is not valid for main_function")
        return self


class ProfileAdminCreate(ProfileFields):
    user_id: int = Field(gt=0)
    organizational_unit_id: int = Field(gt=0)


class ProfileSelfCreate(ProfileFields):
    organizational_unit_id: int = Field(gt=0)


class ProfileUpdate(BaseModel):
    slug: str | None = Field(
        default=None, min_length=2, max_length=180, pattern=r"^[a-z0-9]+(?:-[a-z0-9]+)*$"
    )
    full_name: str | None = Field(default=None, min_length=2, max_length=200)
    photo_url: HttpUrl | None = None
    email: str | None = Field(default=None, max_length=320)
    orcid_url: HttpUrl | None = None
    linkedin_url: HttpUrl | None = None
    github_url: HttpUrl | None = None
    google_scholar_url: HttpUrl | None = None
    main_function: MainFunction | None = None
    category: ProfileCategory | None = None
    position: ProfilePosition | None = None
    area_of_activity: str | None = None
    publication_status: ProfilePublicationStatus | None = None
    organizational_unit_id: int | None = Field(default=None, gt=0)

    @model_validator(mode="after")
    def required_fields_cannot_be_cleared(self):
        for field_name in (
            "slug",
            "full_name",
            "main_function",
            "category",
            "publication_status",
            "organizational_unit_id",
        ):
            if field_name in self.model_fields_set and getattr(self, field_name) is None:
                raise ValueError(f"{field_name} cannot be null")
        return self


class ProfileResponse(ProfileFields):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    organizational_unit_id: int
    publication_status: ProfilePublicationStatus


class PublicProfileResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    slug: str
    full_name: str
    photo_url: str | None
    email: str | None
    orcid_url: str | None
    linkedin_url: str | None
    github_url: str | None
    google_scholar_url: str | None
    main_function: MainFunction
    category: ProfileCategory
    position: ProfilePosition | None
    area_of_activity: str | None
    organizational_unit_id: int
