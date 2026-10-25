from sqlalchemy import ForeignKey, Index, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import BIGINT_ID, Base, TimestampMixin


class ResearchLine(TimestampMixin, Base):
    __tablename__ = "research_lines"
    __table_args__ = (Index("ix_research_lines_profile", "profile_id"),)

    id: Mapped[int] = mapped_column(BIGINT_ID, primary_key=True, autoincrement=True)
    profile_id: Mapped[int] = mapped_column(
        BIGINT_ID,
        ForeignKey(
            "profiles.id",
            name="fk_research_lines_profile",
            ondelete="RESTRICT",
            onupdate="RESTRICT",
        ),
        nullable=False,
    )
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)

    profile: Mapped["Profile"] = relationship(back_populates="research_lines")
