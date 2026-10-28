import test from "node:test";
import assert from "node:assert/strict";

import { createController } from "../js/app.js";
import { parseFenForDisplay } from "../js/fen.js";

const FEN = "7k/8/5KQ1/8/8/8/8/8 w - - 0 1";
const AFTER = "7k/6Q1/5K2/8/8/8/8/8 b - - 1 1";

class FakeView {
  constructor() { this.snapshots = []; }
  bind(actions) { this.actions = actions; }
  preparePosition(fen) { return parseFenForDisplay(fen); }
  render(snapshot) { this.snapshots.push(structuredClone(snapshot)); this.last = this.snapshots.at(-1); }
}

class FakeApi {
  constructor(outcomes) { this.outcomes = outcomes; this.operations = []; }
  async execute(operation, context) { this.operations.push(structuredClone(operation)); return { ...this.outcomes.shift(), ...context }; }
  cancel() {}
}

const catalog = { kind: "catalog", tasks: [1, 2, 3, 4, 5].map((n) => ({ id: `task-0${n}` })) };
const task = (id = "task-01", fen = FEN) => ({ kind: "task", task: { id, fen } });

test("controller loads first task, keeps board after illegal and blocks after correct", async () => {
  const api = new FakeApi([catalog, task(), { kind: "result", result: { task_id: "task-01", result: "illegal", fen_after: null } }, { kind: "result", result: { task_id: "task-01", result: "correct", fen_after: AFTER } }]);
  const view = new FakeView();
  const controller = createController(api, view);
  await controller.start();
  assert.equal(view.last.taskId, "task-01");
  await controller.selectSquare("g6");
  await controller.selectSquare("g5");
  assert.equal(view.last.resultMessage, "Недопустимый ход");
  await controller.selectSquare("g6");
  await controller.selectSquare("g7");
  assert.equal(view.last.solved, true);
  assert.equal(view.last.sideToMove, "white");
  const count = api.operations.length;
  await controller.selectSquare("h8");
  assert.equal(api.operations.length, count);
});

test("promotion choices come only from server and selected piece is preserved", async () => {
  const choices = ["q", "r", "b", "n"];
  const api = new FakeApi([catalog, task("task-01", "8/P7/8/8/8/8/8/k1K5 w - - 0 1"), { kind: "promotionRequired", error: { code: "PROMOTION_REQUIRED", message: "Выберите", details: { choices } } }, { kind: "result", result: { task_id: "task-01", result: "incorrect", fen_after: AFTER } }]);
  const view = new FakeView();
  const controller = createController(api, view);
  await controller.start();
  await controller.selectSquare("a7");
  await controller.selectSquare("a8");
  assert.deepEqual(view.last.promotionChoices, choices);
  assert.equal(view.last.canRetry, false);
  await controller.choosePromotion("r");
  assert.equal(api.operations.at(-1).body.promotion, "r");
});

test("next keeps last task playable and finishes only after explicit click", async () => {
  const allTasks = [catalog, task("task-01")];
  for (let n = 2; n <= 5; n += 1) allTasks.push(task(`task-0${n}`));
  const api = new FakeApi(allTasks);
  const view = new FakeView();
  const controller = createController(api, view);
  await controller.start();
  for (let n = 2; n <= 5; n += 1) await controller.next();
  assert.equal(view.last.taskId, "task-05");
  assert.equal(view.last.finished, false);
  const count = api.operations.length;
  await controller.next();
  assert.equal(view.last.finished, true);
  assert.equal(view.last.resultMessage, "Задачи закончились");
  assert.equal(api.operations.length, count);
});
