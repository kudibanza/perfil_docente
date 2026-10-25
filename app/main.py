from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.auth import router as auth_router
from app.api.admin_dashboard import router as admin_dashboard_router
from app.api.academic_years import router as academic_years_router
from app.api.catalog import router as catalog_router
from app.api.profile_data import router as profile_data_router
from app.api.profiles import router as profiles_router
from app.api.public_profiles import (
    photo_router as public_profile_photos_router,
    router as public_profiles_router,
)
from app.api.users import router as users_router
from app.api.organizational_units import router as organizational_units_router
from app.core.config import get_settings

settings = get_settings()
app = FastAPI(title=settings.app_name)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=False,
    allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)
app.include_router(auth_router, prefix="/api/v1")
app.include_router(admin_dashboard_router, prefix="/api/v1")
app.include_router(academic_years_router, prefix="/api/v1")
app.include_router(profiles_router, prefix="/api/v1")
app.include_router(profile_data_router, prefix="/api/v1")
app.include_router(catalog_router, prefix="/api/v1")
app.include_router(public_profiles_router, prefix="/api/v1")
app.include_router(public_profile_photos_router, prefix="/api/v1")
app.include_router(users_router, prefix="/api/v1")
app.include_router(organizational_units_router, prefix="/api/v1")


@app.get("/health", tags=["health"])
def health_check() -> dict[str, str]:
    return {"status": "ok"}
