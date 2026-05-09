import re
import secrets
import time
from dataclasses import dataclass
from typing import Callable


EMAIL_PATTERN = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


@dataclass(frozen=True)
class CodeRequest:
    email: str
    code: str
    expires_at: float
    attempts: int = 0
    locked: bool = False


@dataclass(frozen=True)
class AuthSession:
    email: str
    token: str
    expires_at: float


class AuthService:
    def __init__(
        self,
        code_ttl_seconds: int = 600,
        session_ttl_seconds: int = 60 * 60 * 24 * 7,
        resend_cooldown_seconds: int = 30,
        max_verify_attempts: int = 5,
        clock: Callable[[], float] = time.time,
    ):
        self.code_ttl_seconds = code_ttl_seconds
        self.session_ttl_seconds = session_ttl_seconds
        self.resend_cooldown_seconds = resend_cooldown_seconds
        self.max_verify_attempts = max_verify_attempts
        self.clock = clock
        self._codes: dict[str, CodeRequest] = {}
        self._sessions: dict[str, AuthSession] = {}

    def request_code(self, email: str) -> CodeRequest:
        normalized_email = self._normalize_email(email)
        existing_request = self._codes.get(normalized_email)
        now = self.clock()
        if existing_request and existing_request.expires_at >= now:
            created_at = existing_request.expires_at - self.code_ttl_seconds
            if now - created_at < self.resend_cooldown_seconds:
                raise ValueError("Please wait before requesting another code")

        code = f"{secrets.randbelow(1_000_000):06d}"
        request = CodeRequest(
            email=normalized_email,
            code=code,
            expires_at=now + self.code_ttl_seconds,
        )
        self._codes[normalized_email] = request
        return request

    def verify_code(self, email: str, code: str) -> AuthSession | bool:
        normalized_email = self._normalize_email(email)
        request = self._codes.get(normalized_email)
        if not request:
            return False
        if request.expires_at < self.clock():
            self._codes.pop(normalized_email, None)
            return False
        if request.locked:
            return False
        if request.code != code.strip():
            attempts = request.attempts + 1
            self._codes[normalized_email] = CodeRequest(
                email=request.email,
                code=request.code,
                expires_at=request.expires_at,
                attempts=attempts,
                locked=attempts >= self.max_verify_attempts,
            )
            return False

        self._codes.pop(normalized_email, None)
        session = AuthSession(
            email=normalized_email,
            token=secrets.token_urlsafe(32),
            expires_at=self.clock() + self.session_ttl_seconds,
        )
        self._sessions[session.token] = session
        return session

    def validate_session(self, token: str | None) -> AuthSession | None:
        if not token:
            return None
        session = self._sessions.get(token)
        if not session:
            return None
        if session.expires_at < self.clock():
            self._sessions.pop(token, None)
            return None
        return session

    def clear_code(self, email: str) -> None:
        try:
            normalized_email = self._normalize_email(email)
        except ValueError:
            return
        self._codes.pop(normalized_email, None)

    def logout(self, token: str | None) -> None:
        if token:
            self._sessions.pop(token, None)

    def _normalize_email(self, email: str) -> str:
        normalized_email = email.strip().lower()
        if not EMAIL_PATTERN.match(normalized_email):
            raise ValueError("Invalid email address")
        return normalized_email
