"""Optional Pillow checks. Run with python -m unittest discover -s test -p '*_test.py'."""
import pathlib
import runpy
import tempfile
import unittest
from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parent.parent


class CaptureGeometryTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory(prefix="transcript-assets-")
        self.addCleanup(self.temporary.cleanup)
        self.assets = pathlib.Path(self.temporary.name)
        self.module = runpy.run_path(str(ROOT / "scripts/compose-store-screenshots.py"))
        self.globals = self.module["build_popup_shot"].__globals__
        self.globals["ASSETS"] = self.assets

    def test_missing_font_retains_requested_size_and_reports_fallback(self):
        with self.assertWarnsRegex(RuntimeWarning, "font"):
            heading = self.module["font"]("/nonexistent/fixture-font.ttf", 46)
        with self.assertWarns(RuntimeWarning):
            caption = self.module["font"]("/nonexistent/fixture-font.ttf", 17)
        self.assertGreater(heading.getbbox("Heading")[2], caption.getbbox("Heading")[2])

    def test_wide_live_capture_stays_out_of_copy_column(self):
        Image.new("RGB", (400, 300), (255, 0, 0)).save(self.assets / "raw-popup-live.png")
        self.module["build_popup_shot"]()
        with Image.open(self.assets / "screenshot-1-popup.png") as output:
            self.assertEqual(output.size, (1280, 800))
            with output.convert("RGB").crop((80, 150, 600, 800)) as region:
                colors = region.getcolors(region.width * region.height)
                self.assertIsNotNone(colors)
                self.assertFalse(any(color == (255, 0, 0) for _, color in colors), "capture overlaps copy column")

    def test_undersized_viewer_capture_fails_before_output(self):
        Image.new("RGB", (100, 100), "white").save(self.assets / "raw-viewer.jpg")
        with self.assertRaisesRegex(ValueError, "raw-viewer"):
            self.module["build_viewer_shot"]()
        self.assertFalse((self.assets / "screenshot-3-viewer.png").exists())

    def test_undersized_popup_capture_fails_before_output(self):
        Image.new("RGB", (100, 100), "white").save(self.assets / "raw-popup.jpg")
        with self.assertRaisesRegex(ValueError, "raw-popup"):
            self.module["build_popup_shot"]()
        self.assertFalse((self.assets / "screenshot-1-popup.png").exists())


if __name__ == "__main__":
    unittest.main()
