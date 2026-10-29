import chess

from .models import Attempt, EvaluatedTask, IllegalTask, PositionReport, PromotionRequired, Task

PROMOTIONS = ("q", "r", "b", "n")
PROMOTION_TYPES = {"q": chess.QUEEN, "r": chess.ROOK, "b": chess.BISHOP, "n": chess.KNIGHT}

class ChessEvaluator:
    def evaluate(self, task: Task, attempt: Attempt) -> EvaluatedTask | IllegalTask | PromotionRequired:
        board = chess.Board(task.fen)
        source = chess.parse_square(attempt.from_square)
        target = chess.parse_square(attempt.to_square)
        if source == target:
            return IllegalTask(task.id)
        if attempt.promotion is None:
            move = chess.Move(source, target)
            if move not in board.legal_moves:
                candidates = tuple(chess.Move(source, target, promotion=PROMOTION_TYPES[p]) for p in PROMOTIONS)
                if any(candidate in board.legal_moves for candidate in candidates):
                    return PromotionRequired(PROMOTIONS)
                return IllegalTask(task.id)
        else:
            move = chess.Move(source, target, promotion=PROMOTION_TYPES[attempt.promotion])
            if move not in board.legal_moves:
                return IllegalTask(task.id)
        board.push(move)
        return EvaluatedTask(task.id, "correct" if board.is_checkmate() else "incorrect", board.fen(en_passant="fen"))

    def inspect_position(self, fen: str) -> PositionReport:
        issues: list[str] = []
        try:
            board = chess.Board(fen)
        except (ValueError, TypeError) as exc:
            return PositionReport(False, (f"Некорректный FEN: {exc}",), ())
        if len(fen.split()) != 6:
            issues.append("FEN должен содержать шесть полей")
        if not board.is_valid():
            issues.append(f"Позиция невалидна: status={board.status()}")
        if board.is_game_over(claim_draw=False):
            issues.append("Позиция уже завершена")
        mates: list[str] = []
        if not issues:
            for move in list(board.legal_moves):
                candidate = board.copy(stack=False)
                candidate.push(move)
                if candidate.is_checkmate():
                    mates.append(move.uci())
            if not mates:
                issues.append("В позиции нет мата в один ход")
        return PositionReport(not issues, tuple(issues), tuple(mates))

