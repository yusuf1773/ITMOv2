import test from "node:test";
import assert from "node:assert/strict";

import { createApiClient } from "../js/api.js";

const response = (status, value) => ({
  status,
  ok: status >= 200 && status < 300,
  redirected: false,
  text: async () => JSON.stringify(value),
});

test("API uses relative URLs, exact attempt body and no credentials", async () => {
  const calls = [];
  const api = createApiClient(async (url, init) => {
    calls.push({ url, init });
    return response(200, { task_id: "task 01", result: "illegal", fen_after: null });
  });
  const body = { from: "a1", to: "a2", promotion: null };
  const outcome = await api.execute({ kind: "attempt", method: "POST", taskId: "task 01", body }, { requestId: 1, taskEpoch: 0 });
  assert.equal(outcome.kind, "result");
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, "/api/v1/tasks/task%2001/attempts");
  assert.equal(calls[0].init.credentials, "omit");
  assert.deepEqual(JSON.parse(calls[0].init.body), body);
});

test("PROMOTION_REQUIRED remains a choice outcome and 503 is retryable", async () => {
  const replies = [
    response(400, { error: { code: "PROMOTION_REQUIRED", message: "Выберите", details: { choices: ["q", "r", "b", "n"] } } }),
    response(503, { error: { code: "SERVICE_UNAVAILABLE", message: "Недоступно", details: {} } }),
  ];
  const api = createApiClient(async () => replies.shift());
  const operation = { kind: "attempt", method: "POST", taskId: "task-05", body: { from: "a7", to: "a8", promotion: null } };
  assert.equal((await api.execute(operation, { requestId: 1, taskEpoch: 0 })).kind, "promotionRequired");
  assert.equal((await api.execute(operation, { requestId: 2, taskEpoch: 0 })).kind, "serverError");
});

test("network failure returns once and does not retry automatically", async () => {
  let count = 0;
  const api = createApiClient(async () => {
    count += 1;
    throw new TypeError("offline");
  });
  const outcome = await api.execute({ kind: "catalog", method: "GET" }, { requestId: 1, taskEpoch: 0 });
  assert.equal(outcome.kind, "networkError");
  assert.equal(count, 1);
});

test("deadline includes delayed response body and late completion is ignored", async () => {
  let fireTimeout;
  let resolveBody;
  let now = 0;
  const clock = {
    now: () => now,
    setTimeout: (callback) => { fireTimeout = callback; return 1; },
    clearTimeout: () => {},
  };
  const api = createApiClient(async () => ({
    status: 200,
    redirected: false,
    text: () => new Promise((resolve) => { resolveBody = resolve; }),
  }), clock);
  const pending = api.execute({ kind: "catalog", method: "GET" }, { requestId: 7, taskEpoch: 0 });
  await Promise.resolve();
  await Promise.resolve();
  now = 10000;
  fireTimeout();
  assert.equal((await pending).kind, "timeout");
  resolveBody(JSON.stringify({ tasks: [1, 2, 3, 4, 5].map((n) => ({ id: `task-0${n}` })) }));
  await Promise.resolve();
});

