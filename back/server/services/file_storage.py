import os
import uuid
import shutil
from typing import Dict, Optional
from back.server.models.schemas import FileInfo, UploadResponse


class FileStorage:
    """文件存储管理服务"""

    def __init__(self, uploads_dir: str = "data/uploads", results_dir: str = "data/results"):
        self.uploads_dir = uploads_dir
        self.results_dir = results_dir
        self.files: Dict[str, FileInfo] = {}

        # 确保目录存在
        os.makedirs(uploads_dir, exist_ok=True)
        os.makedirs(results_dir, exist_ok=True)
        self._load_existing_files()

    def _load_existing_files(self):
        """Rebuild the in-memory index for BVH files already on disk."""
        for directory in (self.uploads_dir, self.results_dir):
            for filename in os.listdir(directory):
                if not filename.lower().endswith(".bvh"):
                    continue
                file_id = os.path.splitext(filename)[0]
                self.files[file_id] = FileInfo(
                    id=file_id,
                    filename=filename,
                    path=os.path.join(directory, filename)
                )

    def save_upload(self, file_content: bytes, filename: str) -> UploadResponse:
        """保存上传的 BVH 文件"""
        file_id = str(uuid.uuid4())
        file_path = os.path.join(self.uploads_dir, f"{file_id}.bvh")

        with open(file_path, "wb") as f:
            f.write(file_content)

        self.files[file_id] = FileInfo(
            id=file_id,
            filename=filename,
            path=file_path
        )

        return UploadResponse(
            id=file_id,
            filename=filename,
            file_url=f"/api/file/{file_id}"
        )

    def save_result(self, file_path: str, original_name: str) -> UploadResponse:
        """保存迁移结果文件"""
        file_id = str(uuid.uuid4())
        result_path = os.path.join(self.results_dir, f"{file_id}.bvh")

        shutil.copy(file_path, result_path)

        self.files[file_id] = FileInfo(
            id=file_id,
            filename=f"result_{original_name}",
            path=result_path
        )

        return UploadResponse(
            id=file_id,
            filename=f"result_{original_name}",
            file_url=f"/api/file/{file_id}"
        )

    def get_path(self, file_id: str) -> Optional[str]:
        """获取文件路径"""
        if file_id in self.files:
            return self.files[file_id].path
        return None

    def get_file_info(self, file_id: str) -> Optional[FileInfo]:
        """获取文件信息"""
        return self.files.get(file_id)
