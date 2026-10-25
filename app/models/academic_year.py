from datetime import datetime

from sqlalchemy import (
    CheckConstraint,
    CHAR,
    Computed,
    DateTime,
    ForeignKey,
    Index,
    String,
    UniqueConstraint,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import BIGINT_ID, Base, TimestampMixin


class AcademicYear(TimestampMixin, Base):
    __tablename__ = "academic_years"
    __table_args__ = (
        CheckConstraint(
            "label REGEXP '^[0-9]{4}/[0-9]{4}$'",
            name="chk_academic_year_label_format",
        ),
        CheckConstraint(
            "CAST(SUBSTRING(label, 6, 4) AS UNSIGNED) = "
            "CAST(SUBSTRING(label, 1, 4) AS UNSIGNED) + 1",
            name="chk_academic_year_consecutive_label",
        ),
        CheckConstraint("status IN ('OPEN', 'CLOSED')", name="chk_academic_year_status"),
        CheckConstraint(
            "(status = 'OPEN' AND closed_at IS NULL AND closed_by_user_id IS NULL) "
            "OR status = 'CLOSED'",
            name="chk_academic_year_closure",
        ),
        UniqueConstraint("organizational_unit_id", "label", name="uq_academic_year_unit_label"),
        # MySQL permits multiple NULLs in a unique index. CLOSED years produce NULL here,
        # while the unit id of an OPEN year is unique.
        UniqueConstraint("open_unit_guard", name="uq_academic_year_open_unit"),
        Index("ix_academic_years_unit_status", "organizational_unit_id", "status"),
    )

    id: Mapped[int] = mapped_column(BIGINT_ID, primary_key=True, autoincrement=True)
    organizational_unit_id: Mapped[int] = mapped_column(
        BIGINT_ID,
        ForeignKey(
            "organizational_units.id",
            name="fk_academic_years_organizational_unit",
            ondelete="RESTRICT",
            onupdate="RESTRICT",
        ),
        nullable=False,
    )
    label: Mapped[str] = mapped_column(CHAR(9), nullable=False)
    status: Mapped[str] = mapped_column(String(10), nullable=False)
    opened_at: Mapped[datetime | None] = mapped_column(
        DateTime(), nullable=True, server_default=text("CURRENT_TIMESTAMP")
    )
    opened_by_user_id: Mapped[int | None] = mapped_column(
        BIGINT_ID,
        ForeignKey(
            "users.id", name="fk_academic_years_opened_by", ondelete="RESTRICT", onupdate="RESTRICT"
        ),
    )
    closed_at: Mapped[datetime | None] = mapped_column(DateTime())
    closed_by_user_id: Mapped[int | None] = mapped_column(
        BIGINT_ID,
        ForeignKey(
            "users.id", name="fk_academic_years_closed_by", ondelete="RESTRICT", onupdate="RESTRICT"
        ),
    )
    open_unit_guard: Mapped[int | None] = mapped_column(
        BIGINT_ID,
        Computed(
            "CASE WHEN status = 'OPEN' THEN organizational_unit_id ELSE NULL END",
            persisted=True,
        ),
    )

    organizational_unit: Mapped["OrganizationalUnit"] = relationship(
        back_populates="academic_years"
    )
    teaching_assignments: Mapped[list["TeachingAssignment"]] = relationship(
        back_populates="academic_year"
    )
