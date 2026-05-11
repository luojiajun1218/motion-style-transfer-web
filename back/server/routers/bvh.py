from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from fastapi.responses import FileResponse
from back.server.routers.auth import require_auth_session
from back.server.services.file_storage import FileStorage
from back.server.services.style_service import StyleService
from back.server.models.schemas import TransferRequest, TransferResponse, UploadResponse

router = APIRouter(prefix="/api", tags=["bvh"])

# 初始化服务
storage = FileStorage()
style_service = StyleService(storage)


@router.post("/upload", response_model=UploadResponse, dependencies=[Depends(require_auth_session)])
async def upload_bvh(file: UploadFile = File(...)):
    """上传 BVH 文件"""
    if not file.filename.endswith(".bvh"):
        raise HTTPException(status_code=400, detail="Only BVH files are supported")

    content = await file.read()
    return storage.save_upload(content, file.filename)


@router.post("/transfer", response_model=TransferResponse, dependencies=[Depends(require_auth_session)])
async def transfer_style(request: TransferRequest):
    """执行风格迁移"""
    try:
        source_id = request.effective_source_id
        style_id = request.effective_style_id
        if not source_id:
            raise ValueError("Source file is required")
        if not style_id:
            raise ValueError("Style file is required")

        result = style_service.execute_transfer(source_id, style_id, style_name_override=request.style_name)
        return TransferResponse(**result)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Transfer failed: {str(e)}")


@router.get("/file/{file_id}", dependencies=[Depends(require_auth_session)])
async def download_file(file_id: str):
    """下载 BVH 文件"""
    file_info = storage.get_file_info(file_id)
    if not file_info:
        file_info = style_service.preset_service.get_file_info(file_id)
    if not file_info:
        raise HTTPException(status_code=404, detail="File not found")

    return FileResponse(
        path=file_info.path,
        filename=file_info.filename,
        media_type="application/octet-stream"
    )
