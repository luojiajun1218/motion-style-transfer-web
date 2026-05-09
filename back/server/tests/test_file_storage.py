import tempfile
import unittest
from pathlib import Path

from back.server.services.file_storage import FileStorage


class FileStorageTests(unittest.TestCase):
    def test_rebuilds_existing_upload_index_on_startup(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            uploads_dir = root / "uploads"
            results_dir = root / "results"

            first = FileStorage(str(uploads_dir), str(results_dir))
            saved = first.save_upload(b"HIERARCHY\n", "walk.bvh")

            restarted = FileStorage(str(uploads_dir), str(results_dir))

            self.assertEqual(restarted.get_path(saved.id), str(uploads_dir / f"{saved.id}.bvh"))
            self.assertEqual(restarted.get_file_info(saved.id).filename, f"{saved.id}.bvh")


if __name__ == "__main__":
    unittest.main()
