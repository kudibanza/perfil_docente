from __future__ import annotations

from io import BytesIO
from pathlib import Path
import re
from urllib.parse import urlsplit
from uuid import uuid4

from PIL import Image, ImageOps, UnidentifiedImageError

from app.core.config import get_settings


MAX_PHOTO_BYTES = 5 * 1024 * 1024
MAX_PHOTO_PIXELS = 24_000_000
MAX_PHOTO_DIMENSION = 1600
_FILENAME_PATTERN = re.compile(r"^[a-f0-9]{32}\.webp$")
Image.MAX_IMAGE_PIXELS = MAX_PHOTO_PIXELS


class InvalidProfilePhoto(ValueError):
    pass


def normalize_profile_photo(data: bytes) -> bytes:
    if not data:
        raise InvalidProfilePhoto("O ficheiro está vazio.")
    if len(data) > MAX_PHOTO_BYTES:
        raise InvalidProfilePhoto("A fotografia não pode exceder 5 MB.")
    try:
        with Image.open(BytesIO(data)) as check:
            if check.format not in {"JPEG", "PNG", "WEBP"}:
                raise InvalidProfilePhoto("Use uma imagem JPEG, PNG ou WebP.")
            if check.width * check.height > MAX_PHOTO_PIXELS:
                raise InvalidProfilePhoto("A resolução da imagem é demasiado grande.")
            check.verify()
        with Image.open(BytesIO(data)) as source:
            image = ImageOps.exif_transpose(source)
            image.thumbnail((MAX_PHOTO_DIMENSION, MAX_PHOTO_DIMENSION), Image.Resampling.LANCZOS)
            if "A" in image.getbands():
                image = image.convert("RGBA")
            else:
                image = image.convert("RGB")
            output = BytesIO()
            image.save(output, format="WEBP", quality=86, method=6)
            return output.getvalue()
    except InvalidProfilePhoto:
        raise
    except (UnidentifiedImageError, Image.DecompressionBombError, OSError, ValueError) as exc:
        raise InvalidProfilePhoto("O ficheiro não é uma imagem válida ou está danificado.") from exc


def photo_path(profile_id: int, filename: str) -> Path:
    if not _FILENAME_PATTERN.fullmatch(filename):
        raise FileNotFoundError("Invalid photo name")
    root = get_settings().media_storage_dir.expanduser().resolve()
    path = (root / "profiles" / str(profile_id) / filename).resolve()
    if root not in path.parents:
        raise FileNotFoundError("Invalid photo path")
    return path


def store_profile_photo(profile_id: int, data: bytes) -> tuple[str, Path]:
    filename = f"{uuid4().hex}.webp"
    path = photo_path(profile_id, filename)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(data)
    return filename, path


def public_profile_photo_url(profile_id: int, filename: str) -> str:
    base = get_settings().public_api_base_url.rstrip("/")
    return f"{base}/api/v1/public/profile-photos/{profile_id}/{filename}"


def filename_from_photo_url(profile_id: int, photo_url: str | None) -> str | None:
    if not photo_url:
        return None
    parts = urlsplit(photo_url)
    prefix = f"/api/v1/public/profile-photos/{profile_id}/"
    if not parts.path.startswith(prefix):
        return None
    filename = parts.path.removeprefix(prefix)
    return filename if _FILENAME_PATTERN.fullmatch(filename) else None


def remove_profile_photo(profile_id: int, photo_url: str | None) -> None:
    filename = filename_from_photo_url(profile_id, photo_url)
    if filename is None:
        return
    path = photo_path(profile_id, filename)
    path.unlink(missing_ok=True)
