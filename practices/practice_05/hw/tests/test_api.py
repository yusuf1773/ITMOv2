import json
import unittest
from pathlib import Path

from mate_trainer import create_app


ROOT = Path(__file__).resolve().parents[1]


class ApiTests(unittest.TestCase):
    def setUp(self):
        self.app = create_app({"TESTING": True, "TASKS_PATH": ROOT / "data" / "tasks.json", "UI_ROOT": ROOT / "frontend"})
        self.client = self.app.test_client()

    def error(self, response, status, code):
        self.assertEqual(status, response.status_code)
        self.assertEqual({"error"}, set(response.json))
        self.assertEqual(code, response.json["error"]["code"])
        self.assertIsInstance(response.json["error"]["message"], str)
        self.assertIsInstance(response.json["error"]["details"], dict)

    def test_catalog_positions_and_results_follow_contract(self):
        catalog = self.client.get("/api/v1/tasks")
        self.assertEqual(200, catalog.status_code)
        ids = [item["id"] for item in catalog.json["tasks"]]
        self.assertEqual(5, len(ids))
        self.assertEqual(5, len(set(ids)))
        position = self.client.get(f"/api/v1/tasks/{ids[0]}")
        self.assertEqual({"id", "fen"}, set(position.json))

        illegal = self.client.post(f"/api/v1/tasks/{ids[0]}/attempts", json={"from": "a1", "to": "a2", "promotion": None})
        self.assertEqual({"task_id": ids[0], "result": "illegal", "fen_after": None}, illegal.json)

        correct = self.client.post(f"/api/v1/tasks/{ids[0]}/attempts", json={"from": "g6", "to": "g7", "promotion": None})
        self.assertEqual("correct", correct.json["result"])
        self.assertIsInstance(correct.json["fen_after"], str)

    def test_validation_order_and_categories(self):
        missing = self.client.post("/api/v1/tasks/unknown/attempts", data="{", content_type="text/plain")
        self.error(missing, 404, "TASK_NOT_FOUND")

        route = self.client.get("/api/v1/unknown")
        self.error(route, 404, "ROUTE_NOT_FOUND")
        method = self.client.put("/api/v1/tasks")
        self.error(method, 405, "METHOD_NOT_ALLOWED")
        self.assertIn("GET", method.headers["Allow"])

        url = "/api/v1/tasks/task-01/attempts"
        self.error(self.client.post(url, data="{}", content_type="text/plain"), 415, "UNSUPPORTED_MEDIA_TYPE")
        self.error(self.client.post(url, data="{", content_type="application/json"), 400, "INVALID_JSON")
        self.error(self.client.post(url, json={"from": "g6", "to": "g7"}), 400, "INVALID_REQUEST")
        self.error(self.client.post(url, json={"from": "G6", "to": "g7", "promotion": None}), 400, "INVALID_MOVE_FORMAT")

    def test_unavailable_catalog_precedes_id_and_body(self):
        app = create_app({"TESTING": True, "TASKS_PATH": ROOT / "data" / "absent.json", "UI_ROOT": ROOT / "frontend"})
        client = app.test_client()
        self.error(client.post("/api/v1/tasks/unknown/attempts", data="{", content_type="text/plain"), 503, "SERVICE_UNAVAILABLE")
        self.error(client.get("/api/v1/missing"), 404, "ROUTE_NOT_FOUND")
        self.error(client.put("/api/v1/tasks"), 405, "METHOD_NOT_ALLOWED")

    def test_all_five_positions_have_verified_mating_attempts(self):
        cases = json.loads((ROOT / "tests" / "fixtures" / "task_cases.json").read_text(encoding="utf-8"))
        for task_id, case in cases.items():
            with self.subTest(task_id=task_id):
                source, target, promotion = case["correct"]
                response = self.client.post(
                    f"/api/v1/tasks/{task_id}/attempts",
                    json={"from": source, "to": target, "promotion": promotion},
                )
                self.assertEqual(200, response.status_code)
                self.assertEqual("correct", response.json["result"])

    def test_promotion_handshake_and_each_explicit_piece(self):
        url = "/api/v1/tasks/task-05/attempts"
        required = self.client.post(url, json={"from": "a7", "to": "a8", "promotion": None})
        self.error(required, 400, "PROMOTION_REQUIRED")
        self.assertEqual(["q", "r", "b", "n"], required.json["error"]["details"]["choices"])
        expected = {"q": "correct", "r": "correct", "b": "incorrect", "n": "incorrect"}
        for piece, result in expected.items():
            with self.subTest(piece=piece):
                response = self.client.post(url, json={"from": "a7", "to": "a8", "promotion": piece})
                self.assertEqual(result, response.json["result"])

    def test_strict_request_schema_distinguishes_types_formats_and_legality(self):
        url = "/api/v1/tasks/task-01/attempts"
        for body in (None, [], 3, True, {"from": "g6", "to": "g7", "promotion": False}, {"from": "g6", "to": "g7", "promotion": None, "extra": 1}):
            with self.subTest(body=body):
                response = self.client.post(url, data=json.dumps(body), content_type="application/json")
                self.error(response, 400, "INVALID_REQUEST")
        self.error(self.client.post(url, json={"from": "a9", "to": "g7", "promotion": None}), 400, "INVALID_MOVE_FORMAT")
        self.error(self.client.post(url, json={"from": "g6", "to": "g7", "promotion": "x"}), 400, "INVALID_MOVE_FORMAT")
        illegal = self.client.post(url, json={"from": "g6", "to": "g6", "promotion": None})
        self.assertEqual({"task_id": "task-01", "result": "illegal", "fen_after": None}, illegal.json)


if __name__ == "__main__":
    unittest.main()

