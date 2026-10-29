# Тренажёр «Мат в один ход»

Небольшое Flask-приложение показывает пять шахматных позиций. Браузер отвечает только за отображение и выбор клеток. Backend на `chess` проверяет допустимость хода и мат по общему контракту `.kiro/contracts/mate-in-one-api.md`.

## Запуск в Windows PowerShell

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -e .
.\.venv\Scripts\python.exe -m flask --app mate_trainer:create_app run
```

Откройте `http://127.0.0.1:5000/`.

## Проверки

```powershell
.\.venv\Scripts\python.exe -m unittest discover -s tests -v
node --test frontend/tests/*.test.mjs
.\.venv\Scripts\python.exe -m compileall mate_trainer
```

## Короткая демонстрация

1. В задаче `task-01` нажмите `g6`, затем `g5`: сервер вернёт `incorrect`, исходная доска останется на экране.
2. Нажмите `g6`, затем `g7`: появится правильный результат и конечная позиция.
3. Перейдите к `task-05`, выберите `a7` и `a8`: UI покажет четыре варианта превращения из ответа `PROMOTION_REQUIRED`. Ферзь или ладья дают мат.
4. На последней задаче нажмите «Следующая задача»: просмотр завершится локально без дополнительного HTTP-запроса.
5. Остановите Flask, обновите страницу и нажмите «Повторить» после сообщения о соединении, предварительно снова запустив сервер.

Подробные команды и контрактные запросы находятся в `docs/runbook.md`.

