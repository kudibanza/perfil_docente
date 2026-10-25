from sqlalchemy import (
    CheckConstraint,
    ForeignKey,
    Index,
    String,
    Text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import BIGINT_ID, Base, TimestampMixin


class Profile(TimestampMixin, Base):
    __tablename__ = "profiles"
    __table_args__ = (
        CheckConstraint(
            "main_function IN ('DOCENTE', 'INVESTIGADOR', 'FUNCIONARIO_ADMINISTRATIVO')",
            name="chk_profiles_function",
        ),
        CheckConstraint(
            "(main_function = 'DOCENTE' AND category IN "
            "('ASSISTENTE_ESTAGIARIO', 'ASSISTENTE', 'PROFESSOR_AUXILIAR', "
            "'PROFESSOR_ASSOCIADO', 'PROFESSOR_CATEDRATICO')) OR "
            "(main_function = 'INVESTIGADOR' AND category IN "
            "('ESTAGIARIO_INVESTIGACAO', 'ASSISTENTE_INVESTIGACAO', "
            "'INVESTIGADOR_AUXILIAR', 'INVESTIGADOR_PRINCIPAL')) OR "
            "(main_function = 'FUNCIONARIO_ADMINISTRATIVO' AND category IN "
            "('TECNICO_SUPERIOR', 'TECNICO_MEDIO', 'TECNICO_BASE'))",
            name="chk_profiles_category_by_function",
        ),
        CheckConstraint(
            "position IS NULL OR position IN ('DIRECTOR', 'DIRECTOR_ADJUNTO', "
            "'CHEFE_DEPARTAMENTO', 'CHEFE_SECCAO', 'CHEFE_CENTRO', 'DOCENTE', 'TECNICO')",
            name="chk_profiles_position",
        ),
        CheckConstraint(
            "publication_status IN ('DRAFT', 'PUBLISHED', 'INACTIVE')",
            name="chk_profiles_publication_status",
        ),
        Index("ix_profiles_organizational_unit", "organizational_unit_id"),
        Index("ix_profiles_public_status", "publication_status"),
    )

    id: Mapped[int] = mapped_column(BIGINT_ID, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(
        BIGINT_ID,
        ForeignKey("users.id", name="fk_profiles_user", ondelete="RESTRICT", onupdate="RESTRICT"),
        nullable=False,
        unique=True,
    )
    organizational_unit_id: Mapped[int] = mapped_column(
        BIGINT_ID,
        ForeignKey(
            "organizational_units.id",
            name="fk_profiles_organizational_unit",
            ondelete="RESTRICT",
            onupdate="RESTRICT",
        ),
        nullable=False,
    )
    slug: Mapped[str] = mapped_column(String(180), nullable=False, unique=True)
    full_name: Mapped[str] = mapped_column(String(200), nullable=False)
    photo_url: Mapped[str | None] = mapped_column(String(2048))
    email: Mapped[str | None] = mapped_column(String(320))
    orcid_url: Mapped[str | None] = mapped_column(String(2048))
    linkedin_url: Mapped[str | None] = mapped_column(String(2048))
    github_url: Mapped[str | None] = mapped_column(String(2048))
    google_scholar_url: Mapped[str | None] = mapped_column(String(2048))
    main_function: Mapped[str] = mapped_column(String(40), nullable=False)
    category: Mapped[str] = mapped_column(String(60), nullable=False)
    position: Mapped[str | None] = mapped_column(String(40))
    area_of_activity: Mapped[str | None] = mapped_column(Text)
    publication_status: Mapped[str] = mapped_column(
        String(20), nullable=False, server_default="DRAFT"
    )

    user: Mapped["User"] = relationship(back_populates="profile")
    organizational_unit: Mapped["OrganizationalUnit"] = relationship(back_populates="profiles")
    academic_education: Mapped[list["AcademicEducation"]] = relationship(back_populates="profile")
    research_lines: Mapped[list["ResearchLine"]] = relationship(back_populates="profile")
    publications: Mapped[list["Publication"]] = relationship(back_populates="profile")
    teaching_assignments: Mapped[list["TeachingAssignment"]] = relationship(
        back_populates="profile"
    )
