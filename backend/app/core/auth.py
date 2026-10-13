from typing import Protocol
from uuid import UUID

from fastapi import Depends, Request
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.errors import AppError
from app.db.session import get_db
from app.models.domain import User


class AuthProvider(Protocol):
    async def authenticate(self, request: Request) -> tuple[UUID, str]: ...


class DevelopmentAuthProvider:
    """One fixed local identity. Never accept a user-controlled identity header."""

    async def authenticate(self, request: Request) -> tuple[UUID, str]:
        settings = get_settings()
        return settings.dev_user_id, "dev_local_user"


class ClerkAuthProvider:
    async def authenticate(self, request: Request) -> tuple[UUID, str]:
        # Integration point: verify Bearer JWT signature via JWKS, issuer, audience,
        # expiry and subject, then map Clerk subject to a stable local User UUID.
        # Fail closed until verification is implemented; never trust an unverified JWT.
        raise AppError(401, "UNAUTHORIZED", "Clerk JWT verification is not configured.")


def get_auth_provider() -> AuthProvider:
    return (
        DevelopmentAuthProvider()
        if get_settings().auth_mode == "development"
        else ClerkAuthProvider()
    )


async def current_user(
    request: Request,
    db: Session = Depends(get_db),
    provider: AuthProvider = Depends(get_auth_provider),
) -> User:
    user_id, subject = await provider.authenticate(request)
    user = db.get(User, user_id)
    if user is None:
        user = User(id=user_id, clerk_user_id=subject)
        db.add(user)
        db.flush()
    return user
