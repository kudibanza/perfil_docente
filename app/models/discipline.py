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
from sqlalchemy.dialects import mysql

from app.db.base import BIGINT_ID, Base, TimestampMixin


class Discipline(TimestampMixin, Base):
    __tablename__ = "disciplines"
    __table_args__ = (
        CheckConstraint("curricular_year >= 1", name="chk_disciplines_curricular_year"),
        UniqueConstraint("course_id", "code", name="uq_disciplines_course_code"),
        Index("ix_disciplines_course", "course_id"),
    )

    id: Mapped[int] = mapped_column(BIGINT_ID, primary_key=True, autoincrement=True)
    course_id: Mapped[int] = mapped_column(
        BIGINT_ID,
        ForeignKey(
            "courses.id", name="fk_disciplines_course", ondelete="RESTRICT", onupdate="RESTRICT"
        ),
        nullable=False,
    )
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    code: Mapped[str] = mapped_column(String(40), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    curricular_year: Mapped[int] = mapped_column(mysql.TINYINT(unsigned=True), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text("1"))

    course: Mapped["Course"] = relationship(back_populates="disciplines")
    teaching_assignments: Mapped[list["TeachingAssignment"]] = relationship(
        back_populates="discipline"
    )
