import test from "node:test";
import assert from "node:assert/strict";

import { validateAttempt, validateCatalog, validateError, validateTask } from "../js/contracts.js";
import { parseFenForDisplay } from "../js/fen.js";

test("catalog accepts exactly five unique identifiers and rejects extra fields", () => {
  const valid = { tasks: [1, 2, 3, 4, 5].map((n) => ({ id: `task-0${n}` })) };
  assert.equal(validateCatalog(valid).ok, true);
  assert.equal(validateCatalog({ tasks: valid.tasks.slice(0, 4) }).ok, false);
  assert.equal(validateCatalog({ tasks: [...valid.tasks.slice(0, 4), { id: "task-01" }] }).ok, false);
  assert.equal(validateCatalog({ ...valid, extra: true }).ok, false);
});

test("task, result and error validators enforce ids and nullable fen_after", () => {
  const fen = "7k/8/5KQ1/8/8/8/8/8 w - - 0 1";
  assert.equal(validateTask({ id: "task-01", fen }, "task-01").ok, true);
  assert.equal(validateTask({ id: "task-02", fen }, "task-01").ok, false);
  assert.equal(validateAttempt({ task_id: "task-01", result: "illegal", fen_after: null }, "task-01").ok, true);
  assert.equal(validateAttempt({ task_id: "task-01", result: "correct", fen_after: null }, "task-01").ok, false);
  const promotion = { error: { code: "PROMOTION_REQUIRED", message: "Выберите", details: { choices: ["q", "r", "b", "n"] } } };
  assert.equal(validateError(promotion, 400).ok, true);
  assert.equal(validateError(promotion, 503).ok, false);
});

test("FEN parser creates all cells in a8-h1 order without chess evaluation", () => {
  const parsed = parseFenForDisplay("7k/8/5KQ1/8/8/8/8/8 w - - 0 1");
  assert.equal(parsed.ok, true);
  assert.equal(parsed.value.cells.length, 64);
  assert.equal(parsed.value.cells[0].square, "a8");
  assert.equal(parsed.value.cells[7].piece.symbol, "♚");
  assert.equal(parsed.value.cells.at(-1).square, "h1");
  assert.equal(parsed.value.sideToMove, "white");
  assert.equal(parseFenForDisplay("8/8/8/8/8/8/8/8 w - - 0").ok, false);
});

