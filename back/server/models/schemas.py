from pydantic import BaseModel
from typing import Optional


class UploadResponse(BaseModel):
    id: str
    filename: str
    file_url: str


class TransferRequest(BaseModel):
    source: Optional[str] = None
    style: Optional[str] = None
    source_id: Optional[str] = None
    style_id: Optional[str] = None
    style_name: Optional[str] = None

    @property
    def effective_source_id(self) -> Optional[str]:
        return self.source or self.source_id

    @property
    def effective_style_id(self) -> Optional[str]:
        return self.style or self.style_id


class TransferResponse(BaseModel):
    result_id: str
    result_url: str
    result_name: str
    style_name: str


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
