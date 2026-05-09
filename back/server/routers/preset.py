from fastapi import APIRouter, Depends, HTTPException
from back.server.routers.auth import require_auth_session
from back.server.services.preset_service import PresetService
from back.server.models.schemas import PresetStylesResponse

router = APIRouter(prefix="/api/preset", tags=["preset"], dependencies=[Depends(require_auth_session)])

# 初始化预设风格服务
preset_service = PresetService()


@router.get("/styles", response_model=PresetStylesResponse)
async def get_preset_styles():
    """获取所有预设风格列表"""
    return preset_service.get_all_styles()


@router.get("/{style_id}")
async def get_preset_style_file_id(style_id: str):
    """获取指定预设风格的 file_id"""
    # 检查风格是否存在
    all_styles = preset_service.get_all_styles()

    # 验证 style_id 在预设列表中
    for style in all_styles.emotion:
        if style.id == style_id:
            return {"file_id": style.file_id}

    for style in all_styles.body:
        if style.id == style_id:
            return {"file_id": style.file_id}

    raise HTTPException(status_code=404, detail=f"Preset style '{style_id}' not found")
