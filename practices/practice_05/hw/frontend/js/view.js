import { parseFenForDisplay } from "./fen.js";

const PROMOTION_NAMES = { q: "Ферзь", r: "Ладья", b: "Слон", n: "Конь" };

export function createView(root = document) {
  const board = root.querySelector("#board");
  const taskId = root.querySelector("#task-id");
  const side = root.querySelector("#side-to-move");
  const status = root.querySelector("#status");
  const error = root.querySelector("#error");
  const next = root.querySelector("#next-task");
  const retry = root.querySelector("#retry");
  const promotion = root.querySelector("#promotion");
  let bound = false;

  return {
    preparePosition: parseFenForDisplay,
    bind(actions) {
      if (bound) return;
      bound = true;
      board.addEventListener("click", (event) => {
        const button = event.target.closest("button[data-square]");
        if (button) actions.selectSquare(button.dataset.square);
      });
      next.addEventListener("click", actions.next);
      retry.addEventListener("click", actions.retry);
      promotion.addEventListener("click", (event) => {
        const button = event.target.closest("button[data-promotion]");
        if (button) actions.choosePromotion(button.dataset.promotion);
      });
    },
    render(state) {
      taskId.textContent = state.taskId ? `Задача: ${state.taskId}` : "Загрузка задач";
      side.textContent = state.sideToMove ? `Ход: ${state.sideToMove === "white" ? "белых" : "чёрных"}` : "";
      status.textContent = state.busy ? "Проверяем…" : state.resultMessage || "";
      error.textContent = state.errorMessage || "";
      next.disabled = state.busy || !state.canNext;
      retry.hidden = !state.canRetry;
      retry.disabled = state.busy || !state.canRetry;
      board.replaceChildren();
      if (state.board) {
        for (const cell of state.board.cells) {
          const button = document.createElement("button");
          button.type = "button";
          button.className = `square ${(cell.square.charCodeAt(0) - 97 + Number(cell.square[1])) % 2 === 0 ? "dark" : "light"}`;
          button.dataset.square = cell.square;
          button.disabled = state.busy || state.solved || state.finished || state.promotionChoices.length > 0;
          button.classList.toggle("selected", cell.square === state.selectedSquare);
          button.textContent = cell.piece?.symbol || "";
          button.setAttribute("aria-label", cell.piece ? `${cell.square}, ${cell.piece.name}` : `${cell.square}, пустая клетка`);
          const coordinate = document.createElement("span");
          coordinate.className = "coordinate";
          coordinate.textContent = cell.square;
          button.append(coordinate);
          board.append(button);
        }
      }
      promotion.replaceChildren();
      if (state.promotionChoices.length) {
        const label = document.createElement("p");
        label.textContent = "Выберите фигуру превращения";
        promotion.append(label);
        for (const piece of state.promotionChoices) {
          const button = document.createElement("button");
          button.type = "button";
          button.dataset.promotion = piece;
          button.textContent = PROMOTION_NAMES[piece];
          promotion.append(button);
        }
      }
    },
  };
}

