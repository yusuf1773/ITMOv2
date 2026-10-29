const ERROR_STATUS = {
  INVALID_JSON: 400,
  INVALID_REQUEST: 400,
  INVALID_MOVE_FORMAT: 400,
  PROMOTION_REQUIRED: 400,
  TASK_NOT_FOUND: 404,
  ROUTE_NOT_FOUND: 404,
  METHOD_NOT_ALLOWED: 405,
  UNSUPPORTED_MEDIA_TYPE: 415,
  INTERNAL_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
};
const RESULTS = new Set(["correct", "incorrect", "illegal"]);
const CHOICES = ["q", "r", "b", "n"];

const ok = (value) => ({ ok: true, value });
const fail = (reason) => ({ ok: false, reason });
const exactKeys = (value, keys) => value && typeof value === "object" && !Array.isArray(value)
  && Object.keys(value).length === keys.length && keys.every((key) => Object.hasOwn(value, key));

export function validateCatalog(value) {
  if (!exactKeys(value, ["tasks"]) || !Array.isArray(value.tasks) || value.tasks.length !== 5) return fail("Неверная форма каталога");
  const ids = [];
  for (const task of value.tasks) {
    if (!exactKeys(task, ["id"]) || typeof task.id !== "string" || task.id.length === 0) return fail("Неверный ID задачи");
    ids.push(task.id);
  }
  if (new Set(ids).size !== 5) return fail("ID задач должны быть уникальны");
  return ok({ tasks: value.tasks.map(({ id }) => ({ id })) });
}

export function validateTask(value, expectedId) {
  if (!exactKeys(value, ["id", "fen"]) || value.id !== expectedId || typeof value.fen !== "string" || value.fen.length === 0) return fail("Неверная позиция задачи");
  return ok({ id: value.id, fen: value.fen });
}

export function validateAttempt(value, expectedId) {
  if (!exactKeys(value, ["task_id", "result", "fen_after"]) || value.task_id !== expectedId || !RESULTS.has(value.result)) return fail("Неверный результат попытки");
  if (value.result === "illegal" ? value.fen_after !== null : typeof value.fen_after !== "string" || value.fen_after.length === 0) return fail("Неверный fen_after");
  return ok({ task_id: value.task_id, result: value.result, fen_after: value.fen_after });
}

export function validateError(value, status) {
  if (!exactKeys(value, ["error"]) || !exactKeys(value.error, ["code", "message", "details"])) return fail("Неверная форма ошибки");
  const { code, message, details } = value.error;
  if (!(code in ERROR_STATUS) || ERROR_STATUS[code] !== status || typeof message !== "string" || message.length === 0 || !details || typeof details !== "object" || Array.isArray(details)) return fail("Неверная категория ошибки");
  if (code === "PROMOTION_REQUIRED") {
    if (!exactKeys(details, ["choices"]) || !Array.isArray(details.choices) || details.choices.length !== 4 || !CHOICES.every((piece, index) => details.choices[index] === piece)) return fail("Неверные варианты превращения");
  } else if (Object.keys(details).length !== 0) return fail("Лишние детали ошибки");
  return ok({ code, message, details });
}

