"""Add academic-year lifecycle and normalize teaching assignments.

Revision ID: a91d6e4c2f70
Revises: 6de8f3c2a941
Create Date: 2026-09-28

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import mysql


revision: str = "a91d6e4c2f70"
down_revision: Union[str, Sequence[str], None] = "6de8f3c2a941"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    connection = op.get_bind()
    conflicts = connection.execute(
        sa.text(
            "SELECT discipline_id, academic_year, GROUP_CONCAT(DISTINCT profile_id) AS profile_ids "
            "FROM profile_disciplines GROUP BY discipline_id, academic_year "
            "HAVING COUNT(DISTINCT profile_id) > 1"
        )
    ).all()
    if conflicts:
        details = "; ".join(
            f"discipline {row.discipline_id}, year {row.academic_year}, profiles {row.profile_ids}"
            for row in conflicts
        )
        raise RuntimeError(
            "Cannot migrate teaching assignments: a discipline has multiple teachers in the "
            f"same academic year. Resolve these conflicts first: {details}"
        )

    op.create_table(
        "academic_years",
        sa.Column(
            "id",
            sa.BigInteger().with_variant(mysql.BIGINT(unsigned=True), "mysql"),
            autoincrement=True,
            nullable=False,
        ),
        sa.Column(
            "organizational_unit_id",
            sa.BigInteger().with_variant(mysql.BIGINT(unsigned=True), "mysql"),
            nullable=False,
        ),
        sa.Column("label", sa.CHAR(length=9), nullable=False),
        sa.Column("status", sa.String(length=10), nullable=False),
        sa.Column("opened_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=True),
        sa.Column(
            "opened_by_user_id",
            sa.BigInteger().with_variant(mysql.BIGINT(unsigned=True), "mysql"),
            nullable=True,
        ),
        sa.Column("closed_at", sa.DateTime(), nullable=True),
        sa.Column(
            "closed_by_user_id",
            sa.BigInteger().with_variant(mysql.BIGINT(unsigned=True), "mysql"),
            nullable=True,
        ),
        sa.Column(
            "open_unit_guard",
            sa.BigInteger().with_variant(mysql.BIGINT(unsigned=True), "mysql"),
            sa.Computed(
                "CASE WHEN status = 'OPEN' THEN organizational_unit_id ELSE NULL END",
                persisted=True,
            ),
            nullable=True,
        ),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.Column(
            "updated_at",
            sa.DateTime(),
            server_default=sa.text("CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"),
            nullable=False,
        ),
        sa.CheckConstraint(
            "label REGEXP '^[0-9]{4}/[0-9]{4}$'",
            name="chk_academic_year_label_format",
        ),
        sa.CheckConstraint(
            "CAST(SUBSTRING(label, 6, 4) AS UNSIGNED) = "
            "CAST(SUBSTRING(label, 1, 4) AS UNSIGNED) + 1",
            name="chk_academic_year_consecutive_label",
        ),
        sa.CheckConstraint("status IN ('OPEN', 'CLOSED')", name="chk_academic_year_status"),
        sa.CheckConstraint(
            "(status = 'OPEN' AND closed_at IS NULL AND closed_by_user_id IS NULL) "
            "OR status = 'CLOSED'",
            name="chk_academic_year_closure",
        ),
        sa.ForeignKeyConstraint(
            ["organizational_unit_id"],
            ["organizational_units.id"],
            name="fk_academic_years_organizational_unit",
            onupdate="RESTRICT",
            ondelete="RESTRICT",
        ),
        sa.ForeignKeyConstraint(
            ["opened_by_user_id"],
            ["users.id"],
            name="fk_academic_years_opened_by",
            onupdate="RESTRICT",
            ondelete="RESTRICT",
        ),
        sa.ForeignKeyConstraint(
            ["closed_by_user_id"],
            ["users.id"],
            name="fk_academic_years_closed_by",
            onupdate="RESTRICT",
            ondelete="RESTRICT",
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("organizational_unit_id", "label", name="uq_academic_year_unit_label"),
        sa.UniqueConstraint("open_unit_guard", name="uq_academic_year_open_unit"),
    )
    op.create_index(
        "ix_academic_years_unit_status",
        "academic_years",
        ["organizational_unit_id", "status"],
    )

    op.create_table(
        "teaching_assignments",
        sa.Column(
            "id",
            sa.BigInteger().with_variant(mysql.BIGINT(unsigned=True), "mysql"),
            autoincrement=True,
            nullable=False,
        ),
        sa.Column(
            "profile_id",
            sa.BigInteger().with_variant(mysql.BIGINT(unsigned=True), "mysql"),
            nullable=False,
        ),
        sa.Column(
            "discipline_id",
            sa.BigInteger().with_variant(mysql.BIGINT(unsigned=True), "mysql"),
            nullable=False,
        ),
        sa.Column(
            "academic_year_id",
            sa.BigInteger().with_variant(mysql.BIGINT(unsigned=True), "mysql"),
            nullable=False,
        ),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.Column(
            "updated_at",
            sa.DateTime(),
            server_default=sa.text("CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["profile_id"],
            ["profiles.id"],
            name="fk_teaching_assignments_profile",
            onupdate="RESTRICT",
            ondelete="RESTRICT",
        ),
        sa.ForeignKeyConstraint(
            ["discipline_id"],
            ["disciplines.id"],
            name="fk_teaching_assignments_discipline",
            onupdate="RESTRICT",
            ondelete="RESTRICT",
        ),
        sa.ForeignKeyConstraint(
            ["academic_year_id"],
            ["academic_years.id"],
            name="fk_teaching_assignments_academic_year",
            onupdate="RESTRICT",
            ondelete="RESTRICT",
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "discipline_id",
            "academic_year_id",
            name="uq_teaching_assignment_discipline_year",
        ),
    )
    op.create_index(
        "ix_teaching_assignments_profile_year",
        "teaching_assignments",
        ["profile_id", "academic_year_id"],
    )

    op.create_table(
        "teaching_assignment_semesters",
        sa.Column(
            "id",
            sa.BigInteger().with_variant(mysql.BIGINT(unsigned=True), "mysql"),
            autoincrement=True,
            nullable=False,
        ),
        sa.Column(
            "teaching_assignment_id",
            sa.BigInteger().with_variant(mysql.BIGINT(unsigned=True), "mysql"),
            nullable=False,
        ),
        sa.Column("semester", mysql.TINYINT(unsigned=True), nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.Column(
            "updated_at",
            sa.DateTime(),
            server_default=sa.text("CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"),
            nullable=False,
        ),
        sa.CheckConstraint("semester IN (1, 2)", name="chk_teaching_assignment_semester"),
        sa.ForeignKeyConstraint(
            ["teaching_assignment_id"],
            ["teaching_assignments.id"],
            name="fk_teaching_assignment_semesters_assignment",
            onupdate="RESTRICT",
            ondelete="RESTRICT",
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "teaching_assignment_id",
            "semester",
            name="uq_teaching_assignment_semester",
        ),
    )
    op.create_index(
        "ix_teaching_assignment_semesters_semester",
        "teaching_assignment_semesters",
        ["semester"],
    )

    years = connection.execute(
        sa.text(
            "SELECT DISTINCT c.organizational_unit_id, p.academic_year "
            "FROM profile_disciplines AS p "
            "JOIN disciplines AS d ON d.id = p.discipline_id "
            "JOIN courses AS c ON c.id = d.course_id"
        )
    ).all()
    year_ids: dict[tuple[int, str], int] = {}
    for row in years:
        connection.execute(
            sa.text(
                "INSERT INTO academic_years "
                "(organizational_unit_id, label, status, opened_at, closed_at, created_at, updated_at) "
                "VALUES (:unit_id, :label, 'CLOSED', NULL, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)"
            ),
            {"unit_id": row.organizational_unit_id, "label": row.academic_year},
        )
        year_id = connection.scalar(
            sa.text(
                "SELECT id FROM academic_years "
                "WHERE organizational_unit_id = :unit_id AND label = :label"
            ),
            {"unit_id": row.organizational_unit_id, "label": row.academic_year},
        )
        year_ids[(row.organizational_unit_id, row.academic_year)] = year_id

    rows = connection.execute(
        sa.text(
            "SELECT p.id AS old_id, p.profile_id, p.discipline_id, p.academic_year, p.semester, "
            "p.created_at, p.updated_at, c.organizational_unit_id "
            "FROM profile_disciplines AS p "
            "JOIN disciplines AS d ON d.id = p.discipline_id "
            "JOIN courses AS c ON c.id = d.course_id "
            "ORDER BY p.id"
        )
    ).all()
    assignments: dict[tuple[int, int, int], int] = {}
    for row in rows:
        year_id = year_ids[(row.organizational_unit_id, row.academic_year)]
        key = (row.profile_id, row.discipline_id, year_id)
        assignment_id = assignments.get(key)
        if assignment_id is None:
            connection.execute(
                sa.text(
                    "INSERT INTO teaching_assignments "
                    "(profile_id, discipline_id, academic_year_id, created_at, updated_at) "
                    "VALUES (:profile_id, :discipline_id, :year_id, :created_at, :updated_at)"
                ),
                {
                    "profile_id": row.profile_id,
                    "discipline_id": row.discipline_id,
                    "year_id": year_id,
                    "created_at": row.created_at,
                    "updated_at": row.updated_at,
                },
            )
            assignment_id = connection.scalar(
                sa.text(
                    "SELECT id FROM teaching_assignments "
                    "WHERE profile_id = :profile_id AND discipline_id = :discipline_id "
                    "AND academic_year_id = :year_id"
                ),
                {"profile_id": row.profile_id, "discipline_id": row.discipline_id, "year_id": year_id},
            )
            assignments[key] = assignment_id
        connection.execute(
            sa.text(
                "INSERT INTO teaching_assignment_semesters "
                "(id, teaching_assignment_id, semester, created_at, updated_at) "
                "VALUES (:id, :assignment_id, :semester, :created_at, :updated_at)"
            ),
            {
                "id": row.old_id,
                "assignment_id": assignment_id,
                "semester": row.semester,
                "created_at": row.created_at,
                "updated_at": row.updated_at,
            },
        )

    op.drop_table("profile_disciplines")


def downgrade() -> None:
    op.create_table(
        "profile_disciplines",
        sa.Column(
            "id",
            sa.BigInteger().with_variant(mysql.BIGINT(unsigned=True), "mysql"),
            autoincrement=True,
            nullable=False,
        ),
        sa.Column(
            "profile_id",
            sa.BigInteger().with_variant(mysql.BIGINT(unsigned=True), "mysql"),
            nullable=False,
        ),
        sa.Column(
            "discipline_id",
            sa.BigInteger().with_variant(mysql.BIGINT(unsigned=True), "mysql"),
            nullable=False,
        ),
        sa.Column("academic_year", sa.CHAR(length=9), nullable=False),
        sa.Column("semester", mysql.TINYINT(unsigned=True), nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.Column(
            "updated_at",
            sa.DateTime(),
            server_default=sa.text("CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"),
            nullable=False,
        ),
        sa.CheckConstraint(
            "academic_year REGEXP '^[0-9]{4}/[0-9]{4}$'",
            name="chk_profile_disciplines_academic_year",
        ),
        sa.CheckConstraint(
            "CAST(SUBSTRING(academic_year, 6, 4) AS UNSIGNED) = "
            "CAST(SUBSTRING(academic_year, 1, 4) AS UNSIGNED) + 1",
            name="chk_profile_disciplines_consecutive_academic_year",
        ),
        sa.CheckConstraint("semester IN (1, 2)", name="chk_profile_disciplines_semester"),
        sa.ForeignKeyConstraint(
            ["profile_id"],
            ["profiles.id"],
            name="fk_profile_disciplines_profile",
            onupdate="RESTRICT",
            ondelete="RESTRICT",
        ),
        sa.ForeignKeyConstraint(
            ["discipline_id"],
            ["disciplines.id"],
            name="fk_profile_disciplines_discipline",
            onupdate="RESTRICT",
            ondelete="RESTRICT",
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "profile_id",
            "discipline_id",
            "academic_year",
            "semester",
            name="uq_profile_discipline_year_semester",
        ),
    )
    op.create_index("ix_profile_disciplines_discipline", "profile_disciplines", ["discipline_id"])

    connection = op.get_bind()
    connection.execute(
        sa.text(
            "INSERT INTO profile_disciplines "
            "(id, profile_id, discipline_id, academic_year, semester, created_at, updated_at) "
            "SELECT s.id, a.profile_id, a.discipline_id, y.label, s.semester, s.created_at, s.updated_at "
            "FROM teaching_assignment_semesters AS s "
            "JOIN teaching_assignments AS a ON a.id = s.teaching_assignment_id "
            "JOIN academic_years AS y ON y.id = a.academic_year_id"
        )
    )
    op.drop_table("teaching_assignment_semesters")
    op.drop_index("ix_teaching_assignments_profile_year", table_name="teaching_assignments")
    op.drop_table("teaching_assignments")
    op.drop_index("ix_academic_years_unit_status", table_name="academic_years")
    op.drop_table("academic_years")
