import unittest
from types import SimpleNamespace

from fastapi import HTTPException
from pydantic import ValidationError

from app.api.access import get_manageable_profile
from app.api.deps import assert_unit_access
from app.schemas.academic_years import AcademicYearCreate
from app.schemas.profile_details import TeachingAssignmentCreate
from app.schemas.profiles import ProfileFields


class AcademicYearSchemaTests(unittest.TestCase):
    def test_accepts_consecutive_academic_year(self):
        year = AcademicYearCreate(label="2026/2027", organizational_unit_id=1)

        self.assertEqual(year.label, "2026/2027")

    def test_rejects_non_consecutive_academic_year(self):
        with self.assertRaises(ValidationError):
            AcademicYearCreate(label="2026/2028", organizational_unit_id=1)


class TeachingAssignmentSchemaTests(unittest.TestCase):
    def test_accepts_one_or_both_semesters(self):
        assignment = TeachingAssignmentCreate(
            discipline_id=10,
            academic_year_id=20,
            semesters=[1, 2],
        )

        self.assertEqual(assignment.semesters, [1, 2])

    def test_rejects_duplicate_semesters(self):
        with self.assertRaises(ValidationError):
            TeachingAssignmentCreate(
                discipline_id=10,
                academic_year_id=20,
                semesters=[1, 1],
            )

    def test_rejects_semester_outside_supported_values(self):
        with self.assertRaises(ValidationError):
            TeachingAssignmentCreate(
                discipline_id=10,
                academic_year_id=20,
                semesters=[3],
            )


class ProfileSchemaTests(unittest.TestCase):
    def test_accepts_category_matching_main_function(self):
        profile = ProfileFields(
            slug="docente-teste",
            full_name="Docente de Teste",
            main_function="DOCENTE",
            category="PROFESSOR_ASSOCIADO",
        )

        self.assertEqual(profile.category, "PROFESSOR_ASSOCIADO")

    def test_rejects_category_not_matching_main_function(self):
        with self.assertRaises(ValidationError):
            ProfileFields(
                slug="docente-teste",
                full_name="Docente de Teste",
                main_function="DOCENTE",
                category="INVESTIGADOR_PRINCIPAL",
            )


class AuthorizationTests(unittest.TestCase):
    def test_super_admin_can_access_any_unit(self):
        user = SimpleNamespace(role="SUPER_ADMIN", organizational_unit_id=None)

        assert_unit_access(user, organizational_unit_id=4)

    def test_unit_admin_can_access_own_unit(self):
        user = SimpleNamespace(role="UNIT_ADMIN", organizational_unit_id=1)

        assert_unit_access(user, organizational_unit_id=1)

    def test_unit_admin_cannot_access_another_unit(self):
        user = SimpleNamespace(role="UNIT_ADMIN", organizational_unit_id=1)

        with self.assertRaises(HTTPException) as raised:
            assert_unit_access(user, organizational_unit_id=2)

        self.assertEqual(raised.exception.status_code, 403)

    def test_regular_user_cannot_administer_a_unit(self):
        user = SimpleNamespace(role="USER", organizational_unit_id=None)

        with self.assertRaises(HTTPException) as raised:
            assert_unit_access(user, organizational_unit_id=1)

        self.assertEqual(raised.exception.status_code, 403)

    def test_user_can_manage_only_their_own_profile(self):
        profile = SimpleNamespace(id=7, user_id=12, organizational_unit_id=1)

        class ProfileLookup:
            def get(self, model, profile_id):
                return profile if profile_id == profile.id else None

        own_user = SimpleNamespace(id=12, role="USER", organizational_unit_id=None)
        other_user = SimpleNamespace(id=13, role="USER", organizational_unit_id=None)

        self.assertIs(get_manageable_profile(7, own_user, ProfileLookup()), profile)
        with self.assertRaises(HTTPException) as raised:
            get_manageable_profile(7, other_user, ProfileLookup())

        self.assertEqual(raised.exception.status_code, 403)

    def test_unit_admin_cannot_manage_profile_from_another_unit(self):
        profile = SimpleNamespace(id=7, user_id=12, organizational_unit_id=2)

        class ProfileLookup:
            def get(self, model, profile_id):
                return profile

        unit_admin = SimpleNamespace(id=20, role="UNIT_ADMIN", organizational_unit_id=1)

        with self.assertRaises(HTTPException) as raised:
            get_manageable_profile(7, unit_admin, ProfileLookup())

        self.assertEqual(raised.exception.status_code, 403)


if __name__ == "__main__":
    unittest.main()
