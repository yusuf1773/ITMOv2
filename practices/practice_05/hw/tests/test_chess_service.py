import unittest

from mate_trainer.chess_service import ChessEvaluator
from mate_trainer.models import Attempt, EvaluatedTask, IllegalTask, PromotionRequired, Task


class ChessEvaluatorTests(unittest.TestCase):
    def setUp(self):
        self.evaluator = ChessEvaluator()
        self.task = Task("task-01", "7k/8/5KQ1/8/8/8/8/8 w - - 0 1")

    def test_correct_incorrect_and_illegal_are_independent(self):
        correct = self.evaluator.evaluate(self.task, Attempt("g6", "g7", None))
        self.assertIsInstance(correct, EvaluatedTask)
        self.assertEqual("correct", correct.result)
        self.assertEqual("7k/6Q1/5K2/8/8/8/8/8 b - - 1 1", correct.fen_after)

        incorrect = self.evaluator.evaluate(self.task, Attempt("g6", "g5", None))
        self.assertIsInstance(incorrect, EvaluatedTask)
        self.assertEqual("incorrect", incorrect.result)

        illegal = self.evaluator.evaluate(self.task, Attempt("a1", "a2", None))
        self.assertEqual(IllegalTask("task-01"), illegal)

        repeated = self.evaluator.evaluate(self.task, Attempt("g6", "g7", None))
        self.assertEqual(correct, repeated)

    def test_promotion_is_requested_only_when_a_legal_promotion_exists(self):
        task = Task("promotion", "8/P7/8/8/8/2K5/8/k7 w - - 0 1")
        result = self.evaluator.evaluate(task, Attempt("a7", "a8", None))
        self.assertEqual(PromotionRequired(("q", "r", "b", "n")), result)

        promoted = self.evaluator.evaluate(task, Attempt("a7", "a8", "q"))
        self.assertIsInstance(promoted, EvaluatedTask)
        self.assertEqual("incorrect", promoted.result)

        impossible = self.evaluator.evaluate(task, Attempt("a7", "b8", None))
        self.assertIsInstance(impossible, IllegalTask)

    def test_inspection_rejects_bad_or_finished_positions(self):
        self.assertFalse(self.evaluator.inspect_position("not a fen").valid)
        self.assertFalse(self.evaluator.inspect_position("7k/6Q1/5K2/8/8/8/8/8 b - - 1 1").valid)
        report = self.evaluator.inspect_position(self.task.fen)
        self.assertTrue(report.valid)
        self.assertIn("g6g7", report.mating_moves)


if __name__ == "__main__":
    unittest.main()

