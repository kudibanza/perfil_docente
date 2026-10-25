from sqlalchemy import ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import BIGINT_ID, Base, TimestampMixin


class UserPermissionGrant(TimestampMixin, Base):
    __tablename__ = "user_permissions"
    __table_args__ = (UniqueConstraint("user_id", "code", name="uq_user_permissions_user_code"),)

    id: Mapped[int] = mapped_column(BIGINT_ID, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(
        BIGINT_ID,
        ForeignKey(
            "users.id", name="fk_user_permissions_user", ondelete="CASCADE", onupdate="RESTRICT"
        ),
        nullable=False,
        index=True,
    )
    code: Mapped[str] = mapped_column(String(80), nullable=False)

    user: Mapped["User"] = relationship(back_populates="permissions")
