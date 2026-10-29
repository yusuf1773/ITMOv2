from pathlib import Path

from flask import Flask, request, send_from_directory
from werkzeug.exceptions import MethodNotAllowed, NotFound

from .chess_service import ChessEvaluator
from .dataset import ReadyCatalog, load_catalog
from .http import api_error, create_api

PROJECT_ROOT = Path(__file__).resolve().parents[1]

def create_app(config: dict | None = None) -> Flask:
    app = Flask(__name__, static_folder=None)
    app.config.from_mapping(TASKS_PATH=PROJECT_ROOT / "data" / "tasks.json", UI_ROOT=PROJECT_ROOT / "frontend")
    if config:
        app.config.update(config)
    evaluator = ChessEvaluator()
    catalog = load_catalog(Path(app.config["TASKS_PATH"]), evaluator)
    app.extensions["task_catalog"] = catalog
    if isinstance(catalog, ReadyCatalog):
        app.logger.info("Загружено задач: %s", len(catalog.tasks))
    else:
        app.logger.error("Набор задач недоступен: %s", catalog.reason)
    app.register_blueprint(create_api(evaluator))
    ui_root = Path(app.config["UI_ROOT"])

    @app.get("/")
    def index():
        return send_from_directory(ui_root, "index.html")

    @app.get("/static/ui/styles.css")
    def styles():
        return send_from_directory(ui_root, "styles.css", mimetype="text/css")

    @app.get("/static/ui/js/<path:filename>")
    def scripts(filename: str):
        return send_from_directory(ui_root / "js", filename, mimetype="text/javascript")

    @app.errorhandler(404)
    def not_found(error: NotFound):
        if request.path == "/api/v1" or request.path.startswith("/api/v1/"):
            return api_error(404, "ROUTE_NOT_FOUND")
        return error

    @app.errorhandler(405)
    def method_not_allowed(error: MethodNotAllowed):
        if request.path == "/api/v1" or request.path.startswith("/api/v1/"):
            response, status, _ = api_error(405, "METHOD_NOT_ALLOWED")
            return response, status, {"Allow": ", ".join(error.valid_methods or [])}
        return error

    @app.errorhandler(500)
    def internal_error(error):
        app.logger.exception("Непредвиденная ошибка", exc_info=error)
        return api_error(500, "INTERNAL_ERROR")

    return app

