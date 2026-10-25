from sqlalchemy import CheckConstraint, ForeignKey, Index, SmallInteger, String, Text
from sqlalchemy.dialects import mysql
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import BIGINT_ID, Base, TimestampMixin


class Publication(TimestampMixin, Base):
    __tablename__ = "publications"
    __table_args__ = (
        CheckConstraint("type IN ('BOOK', 'ARTICLE', 'OTHER')", name="chk_publications_type"),
        Index("ix_publications_profile", "profile_id"),
    )

    id: Mapped[int] = mapped_column(BIGINT_ID, primary_key=True, autoincrement=True)
    profile_id: Mapped[int] = mapped_column(
        BIGINT_ID,
        ForeignKey(
            "profiles.id", name="fk_publications_profile", ondelete="RESTRICT", onupdate="RESTRICT"
        ),
        nullable=False,
    )
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    link: Mapped[str | None] = mapped_column(String(2048))
    type: Mapped[str] = mapped_column(String(30), nullable=False)
    citation: Mapped[str | None] = mapped_column(Text)
    publication_year: Mapped[int | None] = mapped_column(mysql.SMALLINT(unsigned=True))

    profile: Mapped["Profile"] = relationship(back_populates="publications")
