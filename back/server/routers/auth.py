import os
import smtplib
from email.message import EmailMessage

from fastapi import APIRouter, Header, HTTPException

from back.server.models.schemas import (
    AuthSessionResponse,
    RequestAuthCodeRequest,
    RequestAuthCodeResponse,
    VerifyAuthCodeRequest,
)
from back.server.services.auth_service import AuthService, AuthSession


router = APIRouter(prefix="/api/auth", tags=["auth"])
auth_service = AuthService()


@router.post("/request-code", response_model=RequestAuthCodeResponse)
async def request_code(request: RequestAuthCodeRequest):
    try:
        code_request = auth_service.request_code(request.email)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    try:
        _send_auth_code(code_request.email, code_request.code)
    except Exception as exc:
        auth_service.clear_code(code_request.email)
        raise HTTPException(status_code=502, detail=f"Failed to send verification email: {exc}")

    debug_code = code_request.code if _debug_codes_enabled() else None
    if debug_code:
        print(f"[AUTH] Verification code for {code_request.email}: {debug_code}")

    return RequestAuthCodeResponse(
        email=code_request.email,
        expires_in_seconds=auth_service.code_ttl_seconds,
        debug_code=debug_code,
    )


@router.post("/verify-code", response_model=AuthSessionResponse)
async def verify_code(request: VerifyAuthCodeRequest):
    try:
        session = auth_service.verify_code(request.email, request.code)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    if not session:
        raise HTTPException(status_code=401, detail="Invalid or expired verification code")
    return AuthSessionResponse(email=session.email, token=session.token)


@router.get("/session", response_model=AuthSessionResponse)
async def get_session(authorization: str | None = Header(default=None)):
    token = _extract_bearer_token(authorization)
    temporary_session = _get_temporary_session(token)
    if temporary_session:
        return AuthSessionResponse(email=temporary_session.email, token=temporary_session.token)

    session = auth_service.validate_session(token)
    if not session:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return AuthSessionResponse(email=session.email, token=session.token)


@router.post("/logout")
async def logout(authorization: str | None = Header(default=None)):
    auth_service.logout(_extract_bearer_token(authorization))
    return {"ok": True}


async def require_auth_session(
    authorization: str | None = Header(default=None),
):
    auth_token = _extract_bearer_token(authorization)
    session = _get_temporary_session(auth_token) or auth_service.validate_session(auth_token)
    if not session:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return session


def _extract_bearer_token(authorization: str | None) -> str | None:
    if not authorization:
        return None
    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer" or not token:
        return None
    return token


def _get_temporary_session(token: str | None) -> AuthSession | None:
    if os.getenv("AUTH_TEMPORARY_LOGIN") != "1":
        return None
    if not token or not token.startswith("temporary-login:"):
        return None

    token_body = token.removeprefix("temporary-login:")
    account = token_body.split(":", 1)[0]
    if not account:
        return None

    return AuthSession(email=account, token=token, expires_at=float("inf"))


def _smtp_enabled() -> bool:
    return bool(os.getenv("SMTP_HOST") and os.getenv("SMTP_FROM"))


def _debug_codes_enabled() -> bool:
    return os.getenv("AUTH_DEBUG_CODES") == "1"


def _send_auth_code(email: str, code: str) -> None:
    if not _smtp_enabled():
        return

    message = EmailMessage()
    message["Subject"] = "Your Motion Style Transfer login code"
    message["From"] = os.environ["SMTP_FROM"]
    message["To"] = email
    message.set_content(f"Your login verification code is {code}. It expires in 10 minutes.")

    host = os.environ["SMTP_HOST"]
    port = int(os.getenv("SMTP_PORT", "587"))
    username = os.getenv("SMTP_USERNAME")
    password = os.getenv("SMTP_PASSWORD")

    with smtplib.SMTP(host, port, timeout=10) as smtp:
        if os.getenv("SMTP_STARTTLS", "1") != "0":
            smtp.starttls()
        if username and password:
            smtp.login(username, password)
        smtp.send_message(message)
