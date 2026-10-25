from sqlalchemy import (
    CheckConstraint,
    ForeignKey,
    Index,
    UniqueConstraint,
)
from sqlalchemy.dialects import mysql
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import BIGINT_ID, Base, TimestampMixin


class TeachingAssignment(TimestampMixin, Base):
    __tablename__ = "teaching_assignments"
    __table_args__ = (
        UniqueConstraint(
            "discipline_id",
            "academic_year_id",
            name="uq_teaching_assignment_discipline_year",
        ),
        Index("ix_teaching_assignments_profile_year", "profile_id", "academic_year_id"),
    )

    id: Mapped[int] = mapped_column(BIGINT_ID, primary_key=True, autoincrement=True)
    profile_id: Mapped[int] = mapped_column(
        BIGINT_ID,
        ForeignKey(
            "profiles.id",
            name="fk_teaching_assignments_profile",
            ondelete="RESTRICT",
            onupdate="RESTRICT",
        ),
        nullable=False,
    )
    discipline_id: Mapped[int] = mapped_column(
        BIGINT_ID,
        ForeignKey(
            "disciplines.id",
            name="fk_teaching_assignments_discipline",
            ondelete="RESTRICT",
            onupdate="RESTRICT",
        ),
        nullable=False,
    )
    academic_year_id: Mapped[int] = mapped_column(
        BIGINT_ID,
        ForeignKey(
            "academic_years.id",
            name="fk_teaching_assignments_academic_year",
            ondelete="RESTRICT",
            onupdate="RESTRICT",
        ),
        nullable=False,
    )

    profile: Mapped["Profile"] = relationship(back_populates="teaching_assignments")
    discipline: Mapped["Discipline"] = relationship(back_populates="teaching_assignments")
    academic_year: Mapped["AcademicYear"] = relationship(back_populates="teaching_assignments")
    semesters: Mapped[list["TeachingAssignmentSemester"]] = relationship(
        back_populates="teaching_assignment",
        order_by="TeachingAssignmentSemester.semester",
        cascade="all, delete-orphan",
    )


class TeachingAssignmentSemester(TimestampMixin, Base):
    __tablename__ = "teaching_assignment_semesters"
    __table_args__ = (
        CheckConstraint("semester IN (1, 2)", name="chk_teaching_assignment_semester"),
        UniqueConstraint(
            "teaching_assignment_id",
            "semester",
            name="uq_teaching_assignment_semester",
        ),
        Index("ix_teaching_assignment_semesters_semester", "semester"),
    )

    id: Mapped[int] = mapped_column(BIGINT_ID, primary_key=True, autoincrement=True)
    teaching_assignment_id: Mapped[int] = mapped_column(
        BIGINT_ID,
        ForeignKey(
            "teaching_assignments.id",
            name="fk_teaching_assignment_semesters_assignment",
            ondelete="RESTRICT",
            onupdate="RESTRICT",
        ),
        nullable=False,
    )
    semester: Mapped[int] = mapped_column(mysql.TINYINT(unsigned=True), nullable=False)

    teaching_assignment: Mapped["TeachingAssignment"] = relationship(back_populates="semesters")
