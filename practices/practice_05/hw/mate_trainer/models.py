from dataclasses import dataclass, field
from typing import Literal, TypeAlias

PromotionPiece: TypeAlias = Literal["q", "r", "b", "n"]
ResultKind: TypeAlias = Literal["correct", "incorrect"]
ErrorCode: TypeAlias = Literal["INVALID_JSON", "INVALID_REQUEST", "INVALID_MOVE_FORMAT", "PROMOTION_REQUIRED", "TASK_NOT_FOUND", "ROUTE_NOT_FOUND", "METHOD_NOT_ALLOWED", "UNSUPPORTED_MEDIA_TYPE", "INTERNAL_ERROR", "SERVICE_UNAVAILABLE"]

@dataclass(frozen=True, slots=True)
class Task:
    id: str
    fen: str

@dataclass(frozen=True, slots=True)
class Attempt:
    from_square: str
    to_square: str
    promotion: PromotionPiece | None

@dataclass(frozen=True, slots=True)
class EvaluatedTask:
    task_id: str
    result: ResultKind
    fen_after: str

@dataclass(frozen=True, slots=True)
class IllegalTask:
    task_id: str
    result: Literal["illegal"] = "illegal"
    fen_after: None = None

@dataclass(frozen=True, slots=True)
class PromotionRequired:
    choices: tuple[PromotionPiece, ...]

@dataclass(frozen=True, slots=True)
class PositionReport:
    valid: bool
    issues: tuple[str, ...]
    mating_moves: tuple[str, ...]

@dataclass(frozen=True, slots=True)
class ApiError:
    status: int
    code: ErrorCode
    message: str
    details: dict[str, object] = field(default_factory=dict)

