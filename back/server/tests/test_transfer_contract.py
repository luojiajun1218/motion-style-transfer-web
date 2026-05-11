import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from back.server.models.schemas import TransferRequest, TransferResponse
from back.server.services.file_storage import FileStorage
from back.server.services.preset_service import PresetService
from back.server.services.style_service import StyleService


class TransferContractTests(unittest.TestCase):
    def test_transfer_request_accepts_source_and_style(self):
        request = TransferRequest(source="source-file", style="style-file")

        self.assertEqual(request.effective_source_id, "source-file")
        self.assertEqual(request.effective_style_id, "style-file")

    def test_transfer_request_accepts_legacy_source_id_and_style_id(self):
        request = TransferRequest(source_id="legacy-source", style_id="legacy-style")

        self.assertEqual(request.effective_source_id, "legacy-source")
        self.assertEqual(request.effective_style_id, "legacy-style")

    def test_transfer_request_prefers_new_fields_over_legacy_fields(self):
        request = TransferRequest(
            source="new-source",
            style="new-style",
            source_id="legacy-source",
            style_id="legacy-style",
        )

        self.assertEqual(request.effective_source_id, "new-source")
        self.assertEqual(request.effective_style_id, "new-style")

    def test_transfer_response_includes_result_name(self):
        response = TransferResponse(
            result_id="result-file",
            result_url="/api/file/result-file",
            result_name="walk_happy.bvh",
            style_name="happy.bvh",
        )

        self.assertEqual(response.result_name, "walk_happy.bvh")
        self.assertEqual(response.style_name, "happy.bvh")

    def test_style_service_returns_and_stores_generated_result_name(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            uploads_dir = root / "uploads"
            results_dir = root / "results"
            storage = FileStorage(str(uploads_dir), str(results_dir))
            source = storage.save_upload(b"HIERARCHY\n", "walk.bvh")
            style = storage.save_upload(b"HIERARCHY\n", "happy.bvh")
            service = StyleService(storage)

            def fake_style_transfer(source_path, style_path, output_path):
                Path(output_path).write_bytes(b"HIERARCHY\n")

            with patch("back.server.services.style_service.style_transfer", fake_style_transfer):
                result = service.execute_transfer(source.id, style.id)

            self.assertEqual(result["result_name"], "walk_happy.bvh")
            self.assertEqual(result["style_name"], "happy.bvh")
            self.assertEqual(storage.get_file_info(result["result_id"]).filename, "walk_happy.bvh")

    def test_preset_service_resolves_preset_file_info(self):
        with tempfile.TemporaryDirectory() as tmp:
            preset_dir = Path(tmp)
            (preset_dir / "angry_13_000.bvh").write_text("HIERARCHY\n")
            service = PresetService(str(preset_dir))

            file_info = service.get_file_info("preset_angry")

            self.assertIsNotNone(file_info)
            self.assertEqual(file_info.filename, "angry_13_000.bvh")


if __name__ == "__main__":
    unittest.main()
