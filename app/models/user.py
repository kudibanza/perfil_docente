from datetime import datetime

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    String,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import BIGINT_ID, Base, TimestampMixin


class User(TimestampMixin, Base):
    __tablename__ = "users"
    __table_args__ = (
        CheckConstraint("role IN ('USER', 'UNIT_ADMIN', 'SUPER_ADMIN')", name="chk_users_role"),
        CheckConstraint(
            "(role = 'UNIT_ADMIN' AND organizational_unit_id IS NOT NULL) OR "
            "(role IN ('USER', 'SUPER_ADMIN') AND organizational_unit_id IS NULL)",
            name="chk_users_unit_by_role",
        ),
        Index("ix_users_organizational_unit", "organizational_unit_id"),
    )

    id: Mapped[int] = mapped_column(BIGINT_ID, primary_key=True, autoincrement=True)
    email: Mapped[str] = mapped_column(String(320), nullable=False, unique=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(String(20), nullable=False)
    organizational_unit_id: Mapped[int | None] = mapped_column(
        BIGINT_ID,
        ForeignKey(
            "organizational_units.id",
            name="fk_users_organizational_unit",
            ondelete="RESTRICT",
            onupdate="RESTRICT",
        ),
    )
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text("1"))
    email_verified_at: Mapped[datetime | None] = mapped_column(DateTime)
    last_login_at: Mapped[datetime | None] = mapped_column(DateTime)

    organizational_unit: Mapped["OrganizationalUnit | None"] = relationship(back_populates="users")
    profile: Mapped["Profile | None"] = relationship(back_populates="user", uselist=False)
    permissions: Mapped[list["UserPermissionGrant"]] = relationship(
        back_populates="user", cascade="all, delete-orphan", lazy="selectin"
    )

    @property
    def profile_id(self) -> int | None:
        return self.profile.id if self.profile is not None else None

    @property
    def profile_organizational_unit_id(self) -> int | None:
        return self.profile.organizational_unit_id if self.profile is not None else None
