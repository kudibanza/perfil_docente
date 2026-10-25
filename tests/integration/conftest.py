import os
from collections.abc import Iterator
from pathlib import Path
from types import SimpleNamespace

import pytest
from alembic import command
from alembic.config import Config
from sqlalchemy import create_engine, inspect, text
from sqlalchemy.engine import Engine, make_url
from sqlalchemy.orm import Session
from starlette.testclient import TestClient


PROJECT_ROOT = Path(__file__).resolve().parents[2]


@pytest.fixture(scope="session")
def test_engine() -> Iterator[Engine]:
    database_url = os.getenv("TEST_DATABASE_URL")
    if not database_url:
        pytest.skip("Set TEST_DATABASE_URL to run the MySQL integration tests")

    parsed_url = make_url(database_url)
    if not parsed_url.database or not parsed_url.database.endswith("_test"):
        pytest.fail("Refusing to run integration tests: database name must end with _test")
    if parsed_url.get_backend_name() != "mysql":
        pytest.fail("Integration tests require a dedicated MySQL database")

    prior_database_url = os.environ.get("DATABASE_URL")
    os.environ["DATABASE_URL"] = database_url

    from app.core.config import get_settings

    get_settings.cache_clear()

    engine = create_engine(database_url, pool_pre_ping=True)
    try:
        from app.db.base import Base
        import app.models  # noqa: F401 -- register all mapped tables.

        known_tables = set(Base.metadata.tables) | {"alembic_version"}
        existing_tables = set(inspect(engine).get_table_names())
        unexpected_tables = existing_tables - known_tables
        if unexpected_tables:
            pytest.fail(
                "Test database contains tables outside this application: "
                + ", ".join(sorted(unexpected_tables))
            )

        config = Config(str(PROJECT_ROOT / "alembic.ini"))
        command.upgrade(config, "head")
        yield engine
    finally:
        engine.dispose()
        if prior_database_url is None:
            os.environ.pop("DATABASE_URL", None)
        else:
            os.environ["DATABASE_URL"] = prior_database_url
        get_settings.cache_clear()


@pytest.fixture(autouse=True)
def isolated_test_data(test_engine: Engine) -> Iterator[None]:
    """Clear only the explicitly named test database before each API test."""
    from app.db.base import Base
    import app.models  # noqa: F401 -- register all mapped tables.

    with test_engine.connect() as connection:
        connection.execute(text("SET FOREIGN_KEY_CHECKS = 0"))
        try:
            for table in reversed(Base.metadata.sorted_tables):
                connection.execute(text(f"TRUNCATE TABLE `{table.name}`"))
        finally:
            connection.execute(text("SET FOREIGN_KEY_CHECKS = 1"))
    yield


@pytest.fixture
def db_session(test_engine: Engine) -> Iterator[Session]:
    with Session(test_engine) as session:
        yield session


@pytest.fixture
def client(test_engine: Engine) -> Iterator[TestClient]:
    from app.db.session import get_db
    from app.main import app

    def override_get_db() -> Iterator[Session]:
        with Session(test_engine) as session:
            yield session

    app.dependency_overrides[get_db] = override_get_db
    try:
        with TestClient(app) as test_client:
            yield test_client
    finally:
        app.dependency_overrides.pop(get_db, None)


@pytest.fixture
def records(db_session: Session) -> SimpleNamespace:
    from app.core.security import hash_password
    from app.models import Course, Discipline, OrganizationalUnit, Profile, User

    first_unit = OrganizationalUnit(
        name="Unidade de Teste Um",
        code="UTEST1",
        is_active=True,
    )
    second_unit = OrganizationalUnit(
        name="Unidade de Teste Dois",
        code="UTEST2",
        is_active=True,
    )
    db_session.add_all([first_unit, second_unit])
    db_session.flush()

    password = hash_password("Integration-test-password-1!")
    unit_admin = User(
        email="unit-admin@test.local",
        password_hash=password,
        role="UNIT_ADMIN",
        organizational_unit_id=first_unit.id,
        is_active=True,
    )
    regular_user = User(
        email="user@test.local",
        password_hash=password,
        role="USER",
        organizational_unit_id=None,
        is_active=True,
    )
    second_teacher = User(
        email="teacher-two@test.local",
        password_hash=password,
        role="USER",
        organizational_unit_id=None,
        is_active=True,
    )
    super_admin = User(
        email="super-admin@test.local",
        password_hash=password,
        role="SUPER_ADMIN",
        organizational_unit_id=None,
        is_active=True,
    )
    db_session.add_all([unit_admin, regular_user, second_teacher, super_admin])
    db_session.flush()

    published_profile = Profile(
        user_id=regular_user.id,
        organizational_unit_id=first_unit.id,
        slug="published-test-profile",
        full_name="Docente Publicado de Teste",
        main_function="DOCENTE",
        category="ASSISTENTE",
        publication_status="PUBLISHED",
    )
    draft_profile = Profile(
        user_id=second_teacher.id,
        organizational_unit_id=first_unit.id,
        slug="draft-test-profile",
        full_name="Docente Rascunho de Teste",
        main_function="DOCENTE",
        category="ASSISTENTE",
        publication_status="DRAFT",
    )
    first_course = Course(
        organizational_unit_id=first_unit.id,
        name="Curso de Teste Um",
        code="CTEST1",
        degree_level="LICENCIATURA",
        is_active=True,
    )
    second_course = Course(
        organizational_unit_id=second_unit.id,
        name="Curso de Teste Dois",
        code="CTEST2",
        degree_level="LICENCIATURA",
        is_active=True,
    )
    db_session.add_all([published_profile, draft_profile, first_course, second_course])
    db_session.flush()

    discipline = Discipline(
        course_id=first_course.id,
        name="Disciplina de Teste",
        code="DTEST1",
        curricular_year=1,
        is_active=True,
    )
    db_session.add(discipline)
    db_session.commit()

    return SimpleNamespace(
        unit_id=first_unit.id,
        other_unit_id=second_unit.id,
        unit_admin_id=unit_admin.id,
        regular_user_id=regular_user.id,
        second_teacher_id=second_teacher.id,
        super_admin_id=super_admin.id,
        profile_id=published_profile.id,
        draft_profile_id=draft_profile.id,
        course_id=first_course.id,
        other_course_id=second_course.id,
        discipline_id=discipline.id,
        password="Integration-test-password-1!",
    )
