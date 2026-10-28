import re
from dataclasses import asdict

from flask import Blueprint, Response, current_app, jsonify, request
from werkzeug.exceptions import BadRequest

from .chess_service import ChessEvaluator
from .dataset import ReadyCatalog, get_task, list_tasks
from .models import ApiError, Attempt, EvaluatedTask, IllegalTask, PromotionRequired

SQUARE = re.compile(r"^[a-h][1-8]$")
PROMOTIONS = {"q", "r", "b", "n"}
MESSAGES = {
    "INVALID_JSON": "Тело запроса не является корректным JSON",
    "INVALID_REQUEST": "Структура запроса не соответствует контракту",
    "INVALID_MOVE_FORMAT": "Формат хода не соответствует контракту",
    "PROMOTION_REQUIRED": "Выберите фигуру превращения",
    "TASK_NOT_FOUND": "Задача не найдена",
    "ROUTE_NOT_FOUND": "Маршрут API не найден",
    "METHOD_NOT_ALLOWED": "Метод не поддерживается",
    "UNSUPPORTED_MEDIA_TYPE": "Требуется Content-Type application/json",
    "INTERNAL_ERROR": "Внутренняя ошибка сервера",
    "SERVICE_UNAVAILABLE": "Набор задач недоступен",
}

def error_response(error: ApiError, headers: dict[str, str] | None = None) -> tuple[Response, int, dict[str, str]]:
    response = jsonify({"error": {"code": error.code, "message": error.message, "details": error.details}})
    return response, error.status, headers or {}

def api_error(status: int, code, details: dict[str, object] | None = None):
    return error_response(ApiError(status, code, MESSAGES[code], details or {}))

def _require_catalog():
    catalog = current_app.extensions["task_catalog"]
    if not isinstance(catalog, ReadyCatalog):
        return None, api_error(503, "SERVICE_UNAVAILABLE")
    return catalog, None

def _require_task(task_id: str):
    catalog, error = _require_catalog()
    if error:
        return None, error
    task = get_task(catalog, task_id)
    if task is None:
        return None, api_error(404, "TASK_NOT_FOUND")
    return task, None

def create_api(evaluator: ChessEvaluator) -> Blueprint:
    api = Blueprint("api", __name__, url_prefix="/api/v1")

    @api.get("/tasks")
    def catalog_route():
        catalog, error = _require_catalog()
        if error:
            return error
        return jsonify({"tasks": [{"id": task.id} for task in list_tasks(catalog)]})

    @api.get("/tasks/<task_id>")
    def task_route(task_id: str):
        task, error = _require_task(task_id)
        if error:
            return error
        return jsonify({"id": task.id, "fen": task.fen})

    @api.post("/tasks/<task_id>/attempts")
    def attempt_route(task_id: str):
        task, error = _require_task(task_id)
        if error:
            return error
        if request.mimetype != "application/json":
            return api_error(415, "UNSUPPORTED_MEDIA_TYPE")
        try:
            value = request.get_json(force=False, silent=False)
        except BadRequest:
            return api_error(400, "INVALID_JSON")
        if not isinstance(value, dict) or set(value) != {"from", "to", "promotion"}:
            return api_error(400, "INVALID_REQUEST")
        source, target, promotion = value["from"], value["to"], value["promotion"]
        if not isinstance(source, str) or not isinstance(target, str) or not (promotion is None or isinstance(promotion, str)):
            return api_error(400, "INVALID_REQUEST")
        if not SQUARE.fullmatch(source) or not SQUARE.fullmatch(target) or (promotion is not None and promotion not in PROMOTIONS):
            return api_error(400, "INVALID_MOVE_FORMAT")
        result = evaluator.evaluate(task, Attempt(source, target, promotion))
        if isinstance(result, PromotionRequired):
            return api_error(400, "PROMOTION_REQUIRED", {"choices": list(result.choices)})
        if isinstance(result, (EvaluatedTask, IllegalTask)):
            return jsonify(asdict(result))
        raise RuntimeError("Неизвестный результат шахматной проверки")

    return api

