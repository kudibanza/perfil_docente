from app.core.security import create_access_token


def bearer(user_id: int) -> dict[str, str]:
    token, _ = create_access_token(user_id)
    return {"Authorization": f"Bearer {token}"}


def test_login_and_current_user(client, records):
    login = client.post(
        "/api/v1/auth/login",
        json={"email": "user@test.local", "password": records.password},
    )

    assert login.status_code == 200
    token = login.json()["access_token"]
    current_user = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert current_user.status_code == 200
    assert current_user.json()["role"] == "USER"


def test_public_endpoint_shows_only_published_profiles(client, records):
    published = client.get("/api/v1/public/profiles/published-test-profile")
    draft = client.get("/api/v1/public/profiles/draft-test-profile")

    assert published.status_code == 200
    assert published.json()["slug"] == "published-test-profile"
    assert draft.status_code == 404


def test_unit_admin_is_limited_to_their_unit_and_super_admin_is_global(client, records):
    unit_admin_response = client.get(
        "/api/v1/courses",
        params={"organizational_unit_id": records.other_unit_id},
        headers=bearer(records.unit_admin_id),
    )
    super_admin_response = client.get(
        "/api/v1/courses",
        params={"organizational_unit_id": records.other_unit_id},
        headers=bearer(records.super_admin_id),
    )

    assert unit_admin_response.status_code == 403
    assert super_admin_response.status_code == 200
    assert [course["id"] for course in super_admin_response.json()] == [records.other_course_id]


def test_regular_user_cannot_create_a_course(client, records):
    response = client.post(
        "/api/v1/courses",
        headers=bearer(records.regular_user_id),
        json={
            "organizational_unit_id": records.unit_id,
            "name": "Curso não autorizado",
            "code": "DENIED1",
            "degree_level": "LICENCIATURA",
        },
    )

    assert response.status_code == 403


def test_open_year_assignment_and_closed_year_lock(client, records):
    headers = bearer(records.unit_admin_id)
    opened = client.post(
        "/api/v1/academic-years",
        headers=headers,
        json={"organizational_unit_id": records.unit_id, "label": "2026/2027"},
    )

    assert opened.status_code == 201
    year_id = opened.json()["id"]

    assigned = client.post(
        f"/api/v1/profiles/{records.profile_id}/disciplines",
        headers=bearer(records.regular_user_id),
        json={
            "discipline_id": records.discipline_id,
            "academic_year_id": year_id,
            "semesters": [1],
        },
    )
    assert assigned.status_code == 201
    assignment_id = assigned.json()["id"]

    closed = client.post(f"/api/v1/academic-years/{year_id}/close", headers=headers)
    assert closed.status_code == 204

    update = client.patch(
        f"/api/v1/profiles/{records.profile_id}/disciplines/{assignment_id}",
        headers=bearer(records.regular_user_id),
        json={"semesters": [2]},
    )
    assert update.status_code == 409


def test_discipline_can_have_only_one_teacher_per_year(client, records):
    headers = bearer(records.unit_admin_id)
    opened = client.post(
        "/api/v1/academic-years",
        headers=headers,
        json={"organizational_unit_id": records.unit_id, "label": "2026/2027"},
    )
    assert opened.status_code == 201
    year_id = opened.json()["id"]

    first = client.post(
        f"/api/v1/profiles/{records.profile_id}/disciplines",
        headers=bearer(records.regular_user_id),
        json={
            "discipline_id": records.discipline_id,
            "academic_year_id": year_id,
            "semesters": [1],
        },
    )
    second = client.post(
        f"/api/v1/profiles/{records.draft_profile_id}/disciplines",
        headers=bearer(records.second_teacher_id),
        json={
            "discipline_id": records.discipline_id,
            "academic_year_id": year_id,
            "semesters": [2],
        },
    )

    assert first.status_code == 201
    assert second.status_code == 409
