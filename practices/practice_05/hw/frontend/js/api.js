import { validateAttempt, validateCatalog, validateError, validateTask } from "./contracts.js";

const defaultClock = {
  now: () => performance.now(),
  setTimeout: (callback, delay) => globalThis.setTimeout(callback, delay),
  clearTimeout: (handle) => globalThis.clearTimeout(handle),
};

function requestDescription(operation) {
  if (operation.kind === "catalog") return { url: "/api/v1/tasks", validator: validateCatalog };
  const task = encodeURIComponent(operation.taskId);
  if (operation.kind === "task") return { url: `/api/v1/tasks/${task}`, validator: (value) => validateTask(value, operation.taskId) };
  return { url: `/api/v1/tasks/${task}/attempts`, validator: (value) => validateAttempt(value, operation.taskId) };
}

export function createApiClient(fetchFn = globalThis.fetch.bind(globalThis), clock = defaultClock) {
  const active = new Map();
  return {
    execute(operation, context) {
      const { url, validator } = requestDescription(operation);
      const controller = new AbortController();
      const deadline = clock.now() + 10000;
      active.set(context.requestId, controller);
      return new Promise((resolve) => {
        let settled = false;
        const finish = (outcome) => {
          if (settled) return;
          settled = true;
          active.delete(context.requestId);
          clock.clearTimeout(timer);
          resolve({ ...outcome, ...context });
        };
        const timer = clock.setTimeout(() => {
          controller.abort();
          finish({ kind: "timeout" });
        }, 10000);
        const init = { method: operation.method, credentials: "omit", cache: "no-store", redirect: "error", signal: controller.signal, headers: { Accept: "application/json" } };
        if (operation.method === "POST") {
          init.headers["Content-Type"] = "application/json";
          init.body = JSON.stringify(operation.body);
        }
        Promise.resolve(fetchFn(url, init)).then(async (response) => {
          if (response.redirected) return finish({ kind: "protocolError", message: "Сервер перенаправил запрос" });
          let value;
          try {
            value = JSON.parse(await response.text());
          } catch {
            return finish(response.status >= 500 ? { kind: "serverError", status: response.status, message: "Сервер временно недоступен" } : { kind: "protocolError", message: "Сервер вернул не JSON" });
          }
          if (clock.now() >= deadline) {
            controller.abort();
            return finish({ kind: "timeout" });
          }
          if (response.status === 200) {
            const checked = validator(value);
            if (!checked.ok) return finish({ kind: "protocolError", message: checked.reason });
            if (operation.kind === "catalog") return finish({ kind: "catalog", ...checked.value });
            if (operation.kind === "task") return finish({ kind: "task", task: checked.value });
            return finish({ kind: "result", result: checked.value });
          }
          const checked = validateError(value, response.status);
          if (!checked.ok) return finish(response.status >= 500 ? { kind: "serverError", status: response.status, message: "Сервер временно недоступен" } : { kind: "protocolError", message: checked.reason });
          if (checked.value.code === "PROMOTION_REQUIRED") return finish({ kind: "promotionRequired", error: checked.value });
          if (response.status >= 500) return finish({ kind: "serverError", status: response.status, error: checked.value });
          return finish({ kind: "clientError", status: response.status, error: checked.value });
        }).catch((error) => {
          if (settled) return;
          if (controller.signal.aborted) finish({ kind: "cancelled" });
          else finish({ kind: "networkError", message: error instanceof Error ? error.message : "Нет соединения" });
        });
      });
    },
    cancel(requestId) {
      active.get(requestId)?.abort();
    },
  };
}

