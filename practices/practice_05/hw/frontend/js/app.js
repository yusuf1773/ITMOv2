import { createApiClient } from "./api.js";
import { createView } from "./view.js";

const cloneOperation = (operation) => ({ ...operation, body: operation.body ? { ...operation.body } : undefined });

export function createController(api, view) {
  const state = {
    phase: "boot", catalog: [], currentIndex: null, currentTask: null, initialFen: null, sideToMove: null, board: null,
    selectedSquare: null, resultMessage: "", solved: false, pendingAttempt: null, promotionChoices: [],
    activeRequest: null, taskEpoch: 0, requestId: 0, errorMessage: "", retryOperation: null, finished: false,
  };

  const snapshot = () => ({
    board: state.board, taskId: state.currentTask?.id || null, sideToMove: state.sideToMove,
    selectedSquare: state.selectedSquare, resultMessage: state.resultMessage, errorMessage: state.errorMessage,
    busy: state.activeRequest !== null, solved: state.solved, finished: state.finished,
    promotionChoices: [...state.promotionChoices], canNext: !!state.currentTask && !state.finished,
    canRetry: state.retryOperation !== null && state.promotionChoices.length === 0,
  });
  const render = () => view.render(snapshot());
  const errorText = (outcome) => {
    if (outcome.kind === "timeout") return "Сервер не ответил за 10 секунд";
    if (outcome.kind === "networkError") return "Нет соединения с сервером";
    if (outcome.kind === "serverError") return "Сервер временно недоступен";
    if (outcome.kind === "clientError") return outcome.error.message;
    return outcome.message || "Ошибка обмена с сервером";
  };
  const isRetryable = (outcome) => ["timeout", "networkError", "serverError", "protocolError"].includes(outcome.kind);

  async function execute(operation, phase, targetIndex = null) {
    if (state.activeRequest || state.finished) return { kind: "cancelled" };
    state.requestId += 1;
    const requestId = state.requestId;
    state.activeRequest = { requestId, operation: cloneOperation(operation), phase, targetIndex };
    state.phase = phase;
    state.errorMessage = "";
    state.retryOperation = null;
    render();
    const outcome = await api.execute(operation, { requestId, taskEpoch: state.taskEpoch });
    if (!state.activeRequest || state.activeRequest.requestId !== requestId || outcome.requestId !== requestId) return { kind: "cancelled" };
    state.activeRequest = null;
    return outcome;
  }

  function recordError(outcome, operation, resumePhase, targetIndex = null) {
    state.phase = resumePhase;
    state.errorMessage = errorText(outcome);
    state.retryOperation = isRetryable(outcome) ? { operation: cloneOperation(operation), resumePhase, targetIndex } : null;
    state.selectedSquare = null;
    render();
  }

  async function loadTask(index, operation = null) {
    const targetId = state.catalog[index]?.id;
    if (!targetId) return;
    const request = operation || { kind: "task", method: "GET", taskId: targetId };
    const outcome = await execute(request, "loading", index);
    if (outcome.kind === "task") {
      const prepared = view.preparePosition(outcome.task.fen);
      if (!prepared.ok) return recordError({ kind: "protocolError", message: prepared.reason }, request, state.currentTask ? "ready" : "boot", index);
      state.currentIndex = index;
      state.currentTask = outcome.task;
      state.initialFen = outcome.task.fen;
      state.sideToMove = prepared.value.sideToMove;
      state.board = prepared.value;
      state.phase = "ready";
      state.taskEpoch += 1;
      state.selectedSquare = null;
      state.resultMessage = "";
      state.solved = false;
      state.pendingAttempt = null;
      state.promotionChoices = [];
      state.errorMessage = "";
      render();
    } else if (outcome.kind !== "cancelled") recordError(outcome, request, state.currentTask ? "ready" : "boot", index);
  }

  async function submit(body, operation = null) {
    const request = operation || { kind: "attempt", method: "POST", taskId: state.currentTask.id, body: { ...body } };
    const outcome = await execute(request, "checking");
    if (outcome.kind === "promotionRequired") {
      state.phase = "choosingPromotion";
      state.pendingAttempt = { from: body.from, to: body.to };
      state.promotionChoices = [...outcome.error.details.choices];
      state.selectedSquare = null;
      state.errorMessage = "";
      render();
      return;
    }
    if (outcome.kind === "result") {
      state.phase = "ready";
      state.pendingAttempt = null;
      state.promotionChoices = [];
      state.selectedSquare = null;
      if (outcome.result.result === "correct") {
        const prepared = view.preparePosition(outcome.result.fen_after);
        if (!prepared.ok) return recordError({ kind: "protocolError", message: prepared.reason }, request, "ready");
        state.board = prepared.value;
        state.solved = true;
        state.resultMessage = "Правильно! Мат в один ход.";
      } else {
        const original = view.preparePosition(state.initialFen);
        state.board = original.value;
        state.solved = false;
        state.resultMessage = outcome.result.result === "incorrect" ? "Ход допустим, но мата нет" : "Недопустимый ход";
      }
      render();
    } else if (outcome.kind !== "cancelled") {
      state.pendingAttempt = body.promotion ? { from: body.from, to: body.to, promotion: body.promotion } : null;
      state.promotionChoices = [];
      recordError(outcome, request, "ready");
    }
  }

  const controller = {
    async start() {
      if (state.phase !== "boot" || state.activeRequest) return;
      const operation = { kind: "catalog", method: "GET" };
      const outcome = await execute(operation, "loading");
      if (outcome.kind === "catalog") {
        state.catalog = outcome.tasks;
        await loadTask(0);
      } else if (outcome.kind !== "cancelled") recordError(outcome, operation, "boot");
    },
    async selectSquare(square) {
      if (state.phase !== "ready" || state.activeRequest || state.solved || state.finished || !state.board) return;
      if (!state.selectedSquare) {
        const cell = state.board.cells.find((item) => item.square === square);
        if (!cell?.piece) return;
        state.selectedSquare = square;
        state.resultMessage = "";
        state.errorMessage = "";
        state.retryOperation = null;
        render();
        return;
      }
      if (state.selectedSquare === square) {
        state.selectedSquare = null;
        render();
        return;
      }
      const body = { from: state.selectedSquare, to: square, promotion: null };
      await submit(body);
    },
    async choosePromotion(piece) {
      if (state.phase !== "choosingPromotion" || state.activeRequest || !state.pendingAttempt || !state.promotionChoices.includes(piece)) return;
      await submit({ ...state.pendingAttempt, promotion: piece });
    },
    async next() {
      if (!state.currentTask || state.activeRequest || state.finished) return;
      state.retryOperation = null;
      state.pendingAttempt = null;
      state.promotionChoices = [];
      if (state.currentIndex + 1 >= state.catalog.length) {
        state.finished = true;
        state.phase = "finished";
        state.resultMessage = "Задачи закончились";
        state.errorMessage = "";
        state.selectedSquare = null;
        render();
        return;
      }
      await loadTask(state.currentIndex + 1);
    },
    async retry() {
      if (!state.retryOperation || state.activeRequest || state.finished) return;
      const retry = state.retryOperation;
      state.retryOperation = null;
      if (retry.operation.kind === "catalog") return controller.start();
      if (retry.operation.kind === "task") return loadTask(retry.targetIndex, retry.operation);
      return submit(retry.operation.body, retry.operation);
    },
    dispose() {
      if (state.activeRequest) api.cancel(state.activeRequest.requestId);
      state.requestId += 1;
      state.activeRequest = null;
    },
  };
  view.bind({ selectSquare: (square) => controller.selectSquare(square), choosePromotion: (piece) => controller.choosePromotion(piece), next: () => controller.next(), retry: () => controller.retry() });
  render();
  return controller;
}

if (typeof document !== "undefined") {
  const controller = createController(createApiClient(), createView());
  controller.start();
}

