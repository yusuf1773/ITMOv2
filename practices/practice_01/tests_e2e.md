# E2E-проверки

| Сценарий пользователя | Предусловия | Действие | Наблюдаемый результат | Evidence |
|---|---|---|---|---|
| Позитивный | Тело запроса с `diff` длиной 1000 символов | POST /api/reviews | 200; JSON c полями summary, risks<=3 (каждый с file, line, evidence, risk), checks | OUT-1 (CASE.md) |
| Негативный | Тело запроса без `diff` | POST /api/reviews | 422 | TRAINING_PR.diff и CASE.md |
| Граничный | Тело запроса с `diff` длиной 20001 символ | POST /api/reviews | 413 | API-1 (CASE.md) |

## Как использовали AI

- Строка в [`prompts.md`](prompts.md): P1-02 (Master Prompt v1).
- Что проверили и исправили сами: согласовали e2e с use case и AC; проверили покрытие позитивных, негативных, граничных случаев; исключили сценарии вне SCOPE-1.
