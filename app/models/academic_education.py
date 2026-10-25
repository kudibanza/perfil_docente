from sqlalchemy import ForeignKey, Index, SmallInteger, String
from sqlalchemy.dialects import mysql
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import BIGINT_ID, Base, TimestampMixin


class AcademicEducation(TimestampMixin, Base):
    __tablename__ = "academic_education"
    __table_args__ = (Index("ix_academic_education_profile", "profile_id"),)

    id: Mapped[int] = mapped_column(BIGINT_ID, primary_key=True, autoincrement=True)
    profile_id: Mapped[int] = mapped_column(
        BIGINT_ID,
        ForeignKey(
            "profiles.id",
            name="fk_academic_education_profile",
            ondelete="RESTRICT",
            onupdate="RESTRICT",
        ),
        nullable=False,
    )
    title_obtained: Mapped[str] = mapped_column(String(120), nullable=False)
    course: Mapped[str] = mapped_column(String(200), nullable=False)
    institution: Mapped[str] = mapped_column(String(200), nullable=False)
    country: Mapped[str | None] = mapped_column(String(100))
    completion_year: Mapped[int | None] = mapped_column(mysql.SMALLINT(unsigned=True))

    profile: Mapped["Profile"] = relationship(back_populates="academic_education")
