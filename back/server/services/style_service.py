import os
import sys
import uuid

# 添加项目根目录到 Python 路径
# style_service.py -> services -> server -> back -> MoST (需要4层dirname)
project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
sys.path.insert(0, project_root)

from back.demo import style_transfer
from back.server.services.file_storage import FileStorage


class StyleService:
    """风格迁移业务服务"""

    def __init__(self, storage: FileStorage):
        self.storage = storage

    def execute_transfer(self, source_id: str, style_id: str) -> dict:
        """执行风格迁移"""
        source_path = self.storage.get_path(source_id)
        style_path = self.storage.get_path(style_id)

        if not source_path or not style_path:
            raise ValueError("Source or style file not found")

        # 生成临时结果文件路径
        temp_result_path = os.path.join(
            project_root,
            "data",
            "results",
            f"temp_{uuid.uuid4()}.bvh"
        )

        # 调用现有的 style_transfer 函数
        style_transfer(source_path, style_path, temp_result_path)

        # 获取原始文件名
        source_info = self.storage.get_file_info(source_id)
        original_name = source_info.filename if source_info else "motion.bvh"

        # 保存结果并返回
        result = self.storage.save_result(temp_result_path, original_name)

        # 删除临时文件
        if os.path.exists(temp_result_path):
            os.remove(temp_result_path)

        return {
            "result_id": result.id,
            "result_url": result.file_url
        }