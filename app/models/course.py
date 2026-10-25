from sqlalchemy import (
    Boolean,
    CheckConstraint,
    ForeignKey,
    Index,
    String,
    Text,
    UniqueConstraint,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import BIGINT_ID, Base, TimestampMixin


class Course(TimestampMixin, Base):
    __tablename__ = "courses"
    __table_args__ = (
        CheckConstraint(
            "degree_level IN ('LICENCIATURA', 'MESTRADO', 'DOUTORAMENTO')",
            name="chk_courses_degree_level",
        ),
        UniqueConstraint("organizational_unit_id", "code", name="uq_courses_unit_code"),
        Index("ix_courses_organizational_unit", "organizational_unit_id"),
    )

    id: Mapped[int] = mapped_column(BIGINT_ID, primary_key=True, autoincrement=True)
    organizational_unit_id: Mapped[int] = mapped_column(
        BIGINT_ID,
        ForeignKey(
            "organizational_units.id",
            name="fk_courses_organizational_unit",
            ondelete="RESTRICT",
            onupdate="RESTRICT",
        ),
        nullable=False,
    )
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    code: Mapped[str] = mapped_column(String(40), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    degree_level: Mapped[str] = mapped_column(String(20), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text("1"))

    organizational_unit: Mapped["OrganizationalUnit"] = relationship(back_populates="courses")
    disciplines: Mapped[list["Discipline"]] = relationship(back_populates="course")
