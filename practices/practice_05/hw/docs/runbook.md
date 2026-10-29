# Запуск и проверка

## Подготовка

Команды выполняются из корня `hw` в Windows PowerShell:

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -e .
```

Зависимости фиксированы в `pyproject.toml`: Flask 3.1.3 и chess 1.11.2.

## Сервер

```powershell
.\.venv\Scripts\python.exe -m flask --app mate_trainer:create_app run
```

UI и API работают на одном origin `http://127.0.0.1:5000`. UI обращается к относительному `/api/v1`; CORS не требуется.

## Автоматические проверки

```powershell
.\.venv\Scripts\python.exe -m unittest discover -s tests -v
node --test frontend/tests/*.test.mjs
.\.venv\Scripts\python.exe -m compileall mate_trainer
```

Браузерный стенд не раздаётся Flask. Для его локального запуска используйте отдельный статический сервер разработки:

```powershell
cd frontend
python -m http.server 8001
```

После этого откройте `http://127.0.0.1:8001/tests/browser-tests.html`. Стенд проверяет настоящий DOM, 64 кнопки, действие выбора и отсутствие горизонтальной прокрутки.

## Контрактные запросы

```powershell
Invoke-RestMethod http://127.0.0.1:5000/api/v1/tasks
Invoke-RestMethod http://127.0.0.1:5000/api/v1/tasks/task-01
Invoke-RestMethod http://127.0.0.1:5000/api/v1/tasks/task-01/attempts -Method Post -ContentType 'application/json' -Body '{"from":"g6","to":"g7","promotion":null}'
```

Для проверки приоритета `503` запустите отдельный процесс с конфигурацией `TASKS_PATH`, указывающей на отсутствующий или повреждённый JSON. HTTP должен продолжать отвечать, операции задач возвращают `SERVICE_UNAVAILABLE`, неизвестный маршрут сохраняет `ROUTE_NOT_FOUND`, а неверный метод сохраняет `METHOD_NOT_ALLOWED`.

## Замена набора

Меняйте только `data/tasks.json`, сохраняя ровно пять объектов с уникальными непустыми `id` и полным FEN. После изменения перезапустите процесс: загрузчик проверяет весь набор атомарно. Повторите тесты и обновите хеш и список матов в `docs/task-validation.md`.

