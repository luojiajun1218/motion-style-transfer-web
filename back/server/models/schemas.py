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


class FileInfo(BaseModel):
    id: str
    filename: str
    path: str