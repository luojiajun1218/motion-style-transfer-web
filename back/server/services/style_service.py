import os
import sys
import uuid

project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
sys.path.insert(0, project_root)

from back.demo import style_transfer
from back.server.services.file_storage import FileStorage
from back.server.services.preset_service import PresetService


class StyleService:
    """Business service for motion style transfer."""

    def __init__(self, storage: FileStorage):
        self.storage = storage
        self.preset_service = PresetService()

    def _get_file_path(self, file_id: str) -> str | None:
        preset_path = self.preset_service.get_path(file_id)
        if preset_path:
            return preset_path
        return self.storage.get_path(file_id)

    def _get_file_name(self, file_id: str) -> str | None:
        upload_info = self.storage.get_file_info(file_id)
        if upload_info:
            return upload_info.filename

        preset_info = self.preset_service.get_file_info(file_id)
        if preset_info:
            return preset_info.filename

        return None

    def _build_result_name(self, source_id: str, style_id: str) -> str:
        source_name = self._get_file_name(source_id)
        style_name = self._get_file_name(style_id)

        if not source_name or not style_name:
            return "styled_motion.bvh"

        source_base = os.path.splitext(source_name.strip())[0]
        style_base = os.path.splitext(style_name.strip())[0]
        if not source_base or not style_base:
            return "styled_motion.bvh"

        return f"{source_base}_{style_base}.bvh"

    def execute_transfer(self, source_id: str, style_id: str, style_name_override: str | None = None) -> dict:
        """Run style transfer and return result file metadata."""
        source_path = self._get_file_path(source_id)
        style_path = self._get_file_path(style_id)

        if not source_path:
            raise ValueError(f"Source file not found: {source_id}")
        if not style_path:
            raise ValueError(f"Style file not found: {style_id}")

        result_name = self._build_result_name(source_id, style_id)
        style_name = style_name_override or self._get_file_name(style_id) or "style.bvh"
        results_dir = os.path.join(project_root, "data", "results")
        os.makedirs(results_dir, exist_ok=True)
        temp_result_path = os.path.join(results_dir, f"temp_{uuid.uuid4()}.bvh")

        style_transfer(source_path, style_path, temp_result_path)

        source_info = self.storage.get_file_info(source_id)
        original_name = source_info.filename if source_info else "motion.bvh"
        result = self.storage.save_result(temp_result_path, original_name, result_name=result_name)

        if os.path.exists(temp_result_path):
            os.remove(temp_result_path)

        return {
            "result_id": result.id,
            "result_url": result.file_url,
            "result_name": result.filename,
            "style_name": style_name,
        }
