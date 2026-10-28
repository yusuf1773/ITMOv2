import tempfile
import unittest
from pathlib import Path

from mate_trainer import create_app


ROOT = Path(__file__).resolve().parents[1]


class RuntimeTests(unittest.TestCase):
    def test_public_ui_surface_is_limited(self):
        with tempfile.TemporaryDirectory() as folder:
            ui = Path(folder)
            (ui / "js").mkdir()
            (ui / "tests").mkdir()
            (ui / "index.html").write_text("<main>ok</main>", encoding="utf-8")
            (ui / "styles.css").write_text("body{}", encoding="utf-8")
            (ui / "js" / "app.js").write_text("export {};", encoding="utf-8")
            (ui / "tests" / "secret.js").write_text("secret", encoding="utf-8")
            (ui / "package.json").write_text("{}", encoding="utf-8")
            app = create_app({"TESTING": True, "TASKS_PATH": ROOT / "data" / "tasks.json", "UI_ROOT": ui})
            client = app.test_client()
            index = client.get("/")
            styles = client.get("/static/ui/styles.css")
            script = client.get("/static/ui/js/app.js")
            self.assertEqual(b"<main>ok</main>", index.data)
            self.assertEqual("text/css; charset=utf-8", styles.content_type)
            self.assertIn("javascript", script.content_type)
            index.close()
            styles.close()
            script.close()
            self.assertEqual(404, client.get("/static/ui/tests/secret.js").status_code)
            self.assertEqual(404, client.get("/static/ui/package.json").status_code)

    def test_attempts_do_not_mutate_shared_position(self):
        app = create_app({"TESTING": True, "TASKS_PATH": ROOT / "data" / "tasks.json", "UI_ROOT": ROOT / "frontend"})
        first = app.test_client()
        second = app.test_client()
        body = {"from": "g6", "to": "g7", "promotion": None}
        before = first.get("/api/v1/tasks/task-01").json
        self.assertEqual(first.post("/api/v1/tasks/task-01/attempts", json=body).json, second.post("/api/v1/tasks/task-01/attempts", json=body).json)
        self.assertEqual(before, first.get("/api/v1/tasks/task-01").json)

    def test_real_ui_files_and_imported_modules_are_served(self):
        app = create_app({"TESTING": True, "TASKS_PATH": ROOT / "data" / "tasks.json", "UI_ROOT": ROOT / "frontend"})
        client = app.test_client()
        index = client.get("/")
        styles = client.get("/static/ui/styles.css")
        self.assertEqual(200, index.status_code)
        self.assertEqual(200, styles.status_code)
        index.close()
        styles.close()
        for module in ("app.js", "api.js", "contracts.js", "fen.js", "view.js"):
            response = client.get(f"/static/ui/js/{module}")
            self.assertEqual(200, response.status_code, module)
            self.assertIn("javascript", response.content_type)
            response.close()
        self.assertEqual(404, client.get("/static/ui/js/../package.json").status_code)
        self.assertEqual(404, client.get("/static/ui/tests/browser-tests.js").status_code)


if __name__ == "__main__":
    unittest.main()
