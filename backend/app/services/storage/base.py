from typing import Protocol

from pydantic import BaseModel


class ObjectMetadata(BaseModel):
    size_bytes: int


class StorageUpload(BaseModel):
    upload_url: str
    method: str = "PUT"
    headers: dict[str, str]
    expires_in_seconds: int = 900


class StorageService(Protocol):
    async def generate_upload_info(self, object_key: str, content_type: str) -> StorageUpload: ...
    async def get_object_metadata(self, object_key: str) -> ObjectMetadata | None: ...
    async def delete_object(self, object_key: str) -> None: ...
