import json
from dataclasses import dataclass
from pathlib import Path
from types import MappingProxyType
from typing import Mapping

from .chess_service import ChessEvaluator
from .models import Task

@dataclass(frozen=True, slots=True)
class ReadyCatalog:
    tasks: tuple[Task, ...]
    by_id: Mapping[str, Task]

@dataclass(frozen=True, slots=True)
class UnavailableCatalog:
    reason: str

Catalog = ReadyCatalog | UnavailableCatalog

def load_catalog(path: Path, evaluator: ChessEvaluator) -> Catalog:
    try:
        raw = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, UnicodeError, json.JSONDecodeError) as exc:
        return UnavailableCatalog(f"Не удалось прочитать набор: {exc}")
    if not isinstance(raw, dict) or set(raw) != {"tasks"} or not isinstance(raw["tasks"], list):
        return UnavailableCatalog("Корневой объект должен содержать только массив tasks")
    if len(raw["tasks"]) != 5:
        return UnavailableCatalog("Набор должен содержать ровно пять задач")
    tasks: list[Task] = []
    seen: set[str] = set()
    for index, item in enumerate(raw["tasks"]):
        if not isinstance(item, dict) or set(item) != {"id", "fen"}:
            return UnavailableCatalog(f"Задача {index + 1} должна содержать только id и fen")
        task_id, fen = item["id"], item["fen"]
        if not isinstance(task_id, str) or not task_id or not isinstance(fen, str) or not fen:
            return UnavailableCatalog(f"Задача {index + 1} содержит неверные типы или пустые значения")
        if task_id in seen:
            return UnavailableCatalog(f"Повторяющийся ID: {task_id}")
        report = evaluator.inspect_position(fen)
        if not report.valid:
            return UnavailableCatalog(f"Задача {task_id} непригодна: {'; '.join(report.issues)}")
        seen.add(task_id)
        tasks.append(Task(task_id, fen))
    frozen = tuple(tasks)
    return ReadyCatalog(frozen, MappingProxyType({task.id: task for task in frozen}))

def list_tasks(catalog: ReadyCatalog) -> tuple[Task, ...]:
    return catalog.tasks

def get_task(catalog: ReadyCatalog, task_id: str) -> Task | None:
    return catalog.by_id.get(task_id)

