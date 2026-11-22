# Практика 7.1 — ассистент для код-ревью в n8n

Тестовый [pull request №12](https://github.com/yusuf1773/ITMOv2/pull/12) в репозитории `yusuf1773/ITMOv2`. Проверялся коммит `75162ba`. [Экспорт workflow PR-review.json](https://chatgpt.com/library?file_id=libfile_6cd2a5e9fdf881918c92fd1629b7ef15&account_id=personal).

## 1. Ревью двумя моделями

| Команда в PR | Модель | Результат |
|---|---|---|
| `/make_ai_review` | GPT‑5.2 | 3 замечания на строках 3, 8 и 13 |
| `/make_other_ai_review` | Qwen 3.5 Flash | 3 замечания на тех же строках |

Обе модели получили одинаковые изменения в `practices/practice_07.1/test.py` и нашли все три намеренных бага. Предложенные исправления немного различаются.

| Строка | Ошибка | GPT‑5.2 | Qwen 3.5 Flash |
|---|---|---|---|
| 3 | Конкатенация строки и `int` вызывает `TypeError` | Предложила f-строку или `str(year)` | Предложила `str(year)` |
| 8 | `history[len(history)]` вызывает `IndexError` даже для непустого списка | Предложила `history[-1]` или индекс `len(history) - 1` | Предложила `history[-1]` |
| 13 | `list.append()` возвращает `None`, а функция должна вернуть список | Предложила отдельно вернуть изменённый список или создать новый | Предложила вызвать `append()`, затем вернуть список |

Скриншоты GPT‑5.2: [команда и строка 3](screenshots/gpt-review-line-3.png), [строки 8 и 13](screenshots/gpt-review-lines-8-13.png), [полный комментарий к строке 13 и вторая команда](screenshots/gpt-review-line-13-and-commands.png).  
Скриншоты Qwen: [строка 3](screenshots/qwen-review-line-3.png), [строки 8 и 13](screenshots/qwen-review-lines-8-13.png), [полный комментарий к строке 13](screenshots/qwen-review-line-13.png).

Во вкладке **Executions** оба запуска дошли до публикации в GitHub и записи в таблицу.

| Время запуска, МСК | ID | Подтверждение |
|---|---:|---|
| 00:24:28 | 19476359 | [Запуск GPT‑5.2](screenshots/execution-gpt.png) |
| 00:25:39 | 19476462 | [Запуск Qwen 3.5 Flash](screenshots/execution-qwen.png) |

## 2. Хранение состояния в Data Table

После публикации узел `Save completed review` записывает результат в `reviewed_prs`. Для PR №12 в таблице видны две записи.

| ID записи | Репозиторий | PR | `review_model` | Время ревью, МСК |
|---:|---|---:|---|---|
| 39 | `yusuf1773/ITMOv2` | 12 | `main` | 23.11.2026, 00:24:37 |
| 40 | `yusuf1773/ITMOv2` | 12 | `other` | 23.11.2026, 00:26:44 |

[Скриншот таблицы reviewed_prs](screenshots/reviewed-prs.png).

## 3. Повторная команда

`Check review not done` ищет запись по тройке `repo_full_name`, `pr_number`, `review_model`. Поэтому вторую модель можно запустить на том же PR, а повторный вызов основной модели после записи в таблицу должен остановиться до запроса diff.

Повторная команда `/make_ai_review` запустила выполнение №19476422 в 00:25:12 МСК. Оно завершилось со статусом **Succeeded** за 1,364 секунды. Последний выполненный узел — `Check review not done`. Узлы `Get changed files`, обе модели и `Publish inline review` не выполнялись. Новое ревью по повторной команде не публиковалось. [Повторный запуск в Executions](screenshots/execution-repeat-blocked.png).

## 4. Точечные комментарии

`Prepare diff hunks` выделяет блоки по заголовкам `@@ … @@` и вычисляет допустимые позиции в старой и новой версиях файла. Модель возвращает `hunk_id`, `line`, `side` и текст замечания. `Build inline review` проверяет координаты, а `Publish inline review` отправляет комментарии в PR.

Тестовый файл целиком попал в один блок `@@ -0,0 +1,13 @@`. В результатах обеих моделей видны отдельные комментарии на строках 3, 8 и 13. [Изменения и точечные комментарии PR №12](https://github.com/yusuf1773/ITMOv2/pull/12/files).
