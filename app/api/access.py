from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import assert_unit_access
from app.models import Course, Profile, User, UserRole


def get_manageable_profile(profile_id: int, user: User, db: Session) -> Profile:
    profile = db.get(Profile, profile_id)
    if profile is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Profile not found")

    if user.role == UserRole.SUPER_ADMIN.value:
        return profile
    if user.role == UserRole.UNIT_ADMIN.value:
        assert_unit_access(user, profile.organizational_unit_id)
        return profile
    if user.role == UserRole.USER.value and profile.user_id == user.id:
        return profile
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN, detail="Not allowed to manage this profile"
    )


def get_visible_course(course_id: int, user: User, db: Session) -> Course:
    course = db.get(Course, course_id)
    if course is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found")
    if user.role == UserRole.SUPER_ADMIN.value:
        return course
    if user.role == UserRole.UNIT_ADMIN.value:
        assert_unit_access(user, course.organizational_unit_id)
        return course
    if user.role == UserRole.USER.value:
        own_profile = user.profile
        if (
            own_profile is not None
            and own_profile.main_function == "DOCENTE"
            and course.is_active
            and course.organizational_unit.is_active
        ):
            return course
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN, detail="Not allowed to access this course"
    )


def commit_unique(db: Session, duplicate_message: str) -> None:
    from sqlalchemy.exc import IntegrityError

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail=duplicate_message) from None
