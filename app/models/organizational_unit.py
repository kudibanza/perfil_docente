from sqlalchemy import Boolean, String, Text, UniqueConstraint, text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import BIGINT_ID, Base, TimestampMixin


class OrganizationalUnit(TimestampMixin, Base):
    __tablename__ = "organizational_units"
    __table_args__ = (
        UniqueConstraint("name", name="uq_organizational_units_name"),
        UniqueConstraint("code", name="uq_organizational_units_code"),
    )

    id: Mapped[int] = mapped_column(BIGINT_ID, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    code: Mapped[str] = mapped_column(String(40), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text("1"))

    users: Mapped[list["User"]] = relationship(back_populates="organizational_unit")
    profiles: Mapped[list["Profile"]] = relationship(back_populates="organizational_unit")
    courses: Mapped[list["Course"]] = relationship(back_populates="organizational_unit")
    academic_years: Mapped[list["AcademicYear"]] = relationship(
        back_populates="organizational_unit"
    )
