import json
import tempfile
import unittest
from pathlib import Path

from mate_trainer.chess_service import ChessEvaluator
from mate_trainer.dataset import ReadyCatalog, UnavailableCatalog, load_catalog


VALID_FENS = [
    "7k/8/5KQ1/8/8/8/8/8 w - - 0 1",
    "k7/8/1QK5/8/8/8/8/8 w - - 0 1",
    "8/8/8/8/8/5kq1/8/7K b - - 0 1",
    "8/8/8/8/8/1QK5/8/k7 w - - 0 1",
    "8/P7/8/8/8/8/8/k1K5 w - - 0 1",
]


class DatasetTests(unittest.TestCase):
    def write(self, value):
        folder = tempfile.TemporaryDirectory()
        self.addCleanup(folder.cleanup)
        path = Path(folder.name) / "tasks.json"
        path.write_text(json.dumps(value), encoding="utf-8")
        return path

    def test_loads_exactly_five_valid_unique_tasks(self):
        path = self.write({"tasks": [{"id": f"task-{i + 1:02}", "fen": fen} for i, fen in enumerate(VALID_FENS)]})
        catalog = load_catalog(path, ChessEvaluator())
        self.assertIsInstance(catalog, ReadyCatalog)
        self.assertEqual(tuple(f"task-{i:02}" for i in range(1, 6)), tuple(t.id for t in catalog.tasks))

    def test_rejects_missing_partial_duplicate_and_extra_fields(self):
        self.assertIsInstance(load_catalog(Path("missing.json"), ChessEvaluator()), UnavailableCatalog)
        four = {"tasks": [{"id": f"task-{i}", "fen": VALID_FENS[i]} for i in range(4)]}
        self.assertIsInstance(load_catalog(self.write(four), ChessEvaluator()), UnavailableCatalog)
        duplicated = {"tasks": [{"id": "same", "fen": fen} for fen in VALID_FENS]}
        self.assertIsInstance(load_catalog(self.write(duplicated), ChessEvaluator()), UnavailableCatalog)
        extra = {"tasks": [{"id": f"task-{i}", "fen": fen, "solution": "hidden"} for i, fen in enumerate(VALID_FENS)]}
        self.assertIsInstance(load_catalog(self.write(extra), ChessEvaluator()), UnavailableCatalog)


if __name__ == "__main__":
    unittest.main()

