import argparse
from getpass import getpass

from sqlalchemy import select

from app.core.security import hash_password
from app.db.session import get_session_factory
from app.models import User, UserRole


def bootstrap_super_admin() -> None:
    email = input("Super admin email: ").strip().lower()
    if "@" not in email or len(email) > 320:
        raise SystemExit("Enter a valid email address.")

    password = getpass("Password (minimum 12 characters): ")
    confirmation = getpass("Confirm password: ")
    if len(password) < 12:
        raise SystemExit("Password must contain at least 12 characters.")
    if password != confirmation:
        raise SystemExit("Passwords do not match.")

    session_factory = get_session_factory()
    with session_factory() as db:
        existing = db.scalar(
            select(User.id).where(User.role == UserRole.SUPER_ADMIN.value).limit(1)
        )
        if existing is not None:
            raise SystemExit("A SUPER_ADMIN already exists; bootstrap is disabled.")

        user = User(
            email=email,
            password_hash=hash_password(password),
            role=UserRole.SUPER_ADMIN.value,
            organizational_unit_id=None,
            is_active=True,
        )
        db.add(user)
        db.commit()
        print(f"Created SUPER_ADMIN account for {email} (user id {user.id}).")


def main() -> None:
    parser = argparse.ArgumentParser(description="UniLuanda administration commands")
    parser.add_argument("command", choices=["bootstrap-super-admin"], help="Command to run")
    args = parser.parse_args()

    if args.command == "bootstrap-super-admin":
        bootstrap_super_admin()


if __name__ == "__main__":
    main()
