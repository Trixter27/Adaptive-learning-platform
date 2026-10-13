import hashlib
import hmac
import secrets
import time
from functools import lru_cache
from pathlib import Path
from urllib.parse import quote

from app.core.config import get_settings
from app.core.errors import AppError
from app.services.storage.base import ObjectMetadata, StorageUpload


class LocalStorageService:
    """Local signed upload URLs expire on restart. Production swaps in S3 storage."""

    def __init__(self, root: Path, api_prefix: str):
        self.root = root.resolve()
        self.api_prefix = api_prefix
        self.signing_key = secrets.token_bytes(32)

    def path(self, object_key: str) -> Path:
        path = (self.root / object_key).resolve()
        if not path.is_relative_to(self.root) or path == self.root:
            raise AppError(400, "INVALID_UPLOAD", "Invalid object key.")
        return path

    def signature(self, object_key: str, expires: int) -> str:
        return hmac.new(
            self.signing_key, f"{object_key}:{expires}".encode(), hashlib.sha256
        ).hexdigest()

    def verify(self, object_key: str, expires: int, token: str) -> None:
        if expires < int(time.time()) or not hmac.compare_digest(
            token, self.signature(object_key, expires)
        ):
            raise AppError(401, "UNAUTHORIZED", "Upload URL is expired or invalid.")

    async def generate_upload_info(self, object_key: str, content_type: str) -> StorageUpload:
        expires = int(time.time()) + 900
        return StorageUpload(
            upload_url=f"{self.api_prefix}/uploads/local/{quote(object_key, safe='/')}?expires={expires}&token={self.signature(object_key, expires)}",
            headers={"Content-Type": content_type},
        )

    async def get_object_metadata(self, object_key: str) -> ObjectMetadata | None:
        path = self.path(object_key)
        return ObjectMetadata(size_bytes=path.stat().st_size) if path.is_file() else None

    async def delete_object(self, object_key: str) -> None:
        self.path(object_key).unlink(missing_ok=True)


@lru_cache
def get_storage() -> LocalStorageService:
    settings = get_settings()
    return LocalStorageService(settings.local_storage_path, settings.api_v1_prefix)
