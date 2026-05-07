import os
from typing import Dict
from back.server.models.schemas import FileInfo, PresetStyle, PresetStylesResponse


class PresetService:
    """预设风格管理服务"""

    # 预设风格配置
    PRESET_CONFIG = {
        "emotion": [
            {"id": "angry", "name": "愤怒", "file": "angry_13_000.bvh"},
            {"id": "depressed", "name": "沮丧", "file": "depressed_13_000.bvh"},
            {"id": "proud", "name": "骄傲", "file": "proud_13_000.bvh"},
            {"id": "sexy", "name": "性感", "file": "sexy_13_000.bvh"},
        ],
        "body": [
            {"id": "childlike", "name": "童稚", "file": "childlike_13_000.bvh"},
            {"id": "neutral", "name": "中性", "file": "neutral_13_000.bvh"},
            {"id": "old", "name": "年老", "file": "old_13_000.bvh"},
            {"id": "strutting", "name": "趾高气扬", "file": "strutting_13_000.bvh"},
        ],
    }

    def __init__(self, preset_dir: str = "data/preset_styles"):
        self.preset_dir = preset_dir
        self.presets: Dict[str, FileInfo] = {}
        self._register_presets()

    def _register_presets(self):
        """启动时注册所有预设风格文件"""
        for category, styles in self.PRESET_CONFIG.items():
            for style in styles:
                file_id = f"preset_{style['id']}"
                file_path = os.path.join(self.preset_dir, style["file"])

                if os.path.exists(file_path):
                    self.presets[file_id] = FileInfo(
                        id=file_id,
                        filename=style["file"],
                        path=file_path
                    )

    def get_all_styles(self) -> PresetStylesResponse:
        """获取所有预设风格列表"""
        emotion_styles = []
        body_styles = []

        for style in self.PRESET_CONFIG["emotion"]:
            file_id = f"preset_{style['id']}"
            emotion_styles.append(PresetStyle(
                id=style["id"],
                name=style["name"],
                file_id=file_id
            ))

        for style in self.PRESET_CONFIG["body"]:
            file_id = f"preset_{style['id']}"
            body_styles.append(PresetStyle(
                id=style["id"],
                name=style["name"],
                file_id=file_id
            ))

        return PresetStylesResponse(emotion=emotion_styles, body=body_styles)

    def get_file_id(self, style_id: str) -> str:
        """获取指定风格的 file_id"""
        return f"preset_{style_id}"

    def get_path(self, file_id: str) -> str | None:
        """获取预设风格文件路径"""
        if file_id in self.presets:
            return self.presets[file_id].path
        return None