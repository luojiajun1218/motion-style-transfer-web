from pydantic import BaseModel
from typing import Optional


class UploadResponse(BaseModel):
    id: str
    filename: str
    file_url: str


class TransferRequest(BaseModel):
    source_id: str
    style_id: str


class TransferResponse(BaseModel):
    result_id: str
    result_url: str


class RequestAuthCodeRequest(BaseModel):
    email: str


class RequestAuthCodeResponse(BaseModel):
    email: str
    expires_in_seconds: int
    debug_code: Optional[str] = None


class VerifyAuthCodeRequest(BaseModel):
    email: str
    code: str


class AuthSessionResponse(BaseModel):
    email: str
    token: str


class FileInfo(BaseModel):
    id: str
    filename: str
    path: str


class PresetStyle(BaseModel):
    """单个预设风格"""
    id: str
    name: str
    file_id: str


class PresetStylesResponse(BaseModel):
    """预设风格列表响应"""
    emotion: list[PresetStyle]
    body: list[PresetStyle]
