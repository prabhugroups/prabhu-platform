import uuid
from pathlib import Path

import pillow_heif
from fastapi import HTTPException, UploadFile, status
from PIL import Image

from app.core.config import get_settings

pillow_heif.register_heif_opener()  # lets PIL.Image.open() decode HEIC/HEIF (iPhone photos)

settings = get_settings()

_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"}
_DOCUMENT_TYPES = {"application/pdf"}
_VIDEO_EXTENSIONS = {
    "video/mp4": ".mp4",
    "video/webm": ".webm",
    "video/quicktime": ".mov",
}
_VIDEO_TYPES = set(_VIDEO_EXTENSIONS)
_ALLOWED_TYPES = _IMAGE_TYPES | _DOCUMENT_TYPES | _VIDEO_TYPES


_UPLOAD_READ_CHUNK_BYTES = 64 * 1024


def _tenant_upload_dir(tenant_slug: str, module: str) -> Path:
    path = Path(settings.uploads_dir) / tenant_slug / module
    path.mkdir(parents=True, exist_ok=True)
    return path


async def _read_bounded(file: UploadFile, max_bytes: int) -> bytes:
    """Reads in fixed-size chunks and aborts as soon as max_bytes is
    exceeded, instead of buffering the whole body first and checking its
    length afterward — the previous approach let an oversized upload sit
    fully in memory before being rejected, which is itself a small
    memory-exhaustion vector on a single small VM."""
    chunks: list[bytes] = []
    total = 0
    while True:
        chunk = await file.read(_UPLOAD_READ_CHUNK_BYTES)
        if not chunk:
            break
        total += len(chunk)
        if total > max_bytes:
            raise HTTPException(status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, "File too large")
        chunks.append(chunk)
    return b"".join(chunks)


async def save_upload(*, tenant_slug: str, module: str, file: UploadFile) -> str:
    """Validates and stores an uploaded file under uploads/<tenant>/<module>/,
    replacing the legacy base64-in-JSON approach with real multipart uploads.
    Returns the relative path stored on the owning row and served back at
    /media/<relative path>."""
    if file.content_type not in _ALLOWED_TYPES:
        raise HTTPException(status.HTTP_415_UNSUPPORTED_MEDIA_TYPE, f"Unsupported type: {file.content_type}")

    contents = await _read_bounded(file, settings.max_upload_bytes)

    directory = _tenant_upload_dir(tenant_slug, module)
    if file.content_type in _IMAGE_TYPES:
        extension = ".webp"
    elif file.content_type in _VIDEO_TYPES:
        extension = _VIDEO_EXTENSIONS[file.content_type]
    else:
        extension = ".pdf"
    filename = f"{uuid.uuid4().hex}{extension}"
    destination = directory / filename

    if file.content_type in _IMAGE_TYPES:
        import io

        with Image.open(io.BytesIO(contents)) as image:
            image = image.convert("RGBA") if image.mode == "P" else image
            image.save(destination, format="WEBP", quality=85)
    else:
        # Videos and PDFs are stored as-is — no server-side transcoding.
        destination.write_bytes(contents)

    return f"{tenant_slug}/{module}/{filename}"
