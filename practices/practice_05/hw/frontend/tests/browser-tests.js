import { createView } from "../js/view.js";
import { firstTask } from "./fixtures.js";

const lines = [];
const check = (condition, title) => {
  if (!condition) throw new Error(title);
  lines.push(`PASS: ${title}`);
};

try {
  const view = createView(document);
  let selected = null;
  view.bind({ selectSquare: (square) => { selected = square; }, choosePromotion: () => {}, next: () => {}, retry: () => {} });
  const prepared = view.preparePosition(firstTask.fen);
  check(prepared.ok, "FEN подготовлен");
  view.render({ board: prepared.value, taskId: firstTask.id, sideToMove: "white", selectedSquare: null, resultMessage: "", errorMessage: "", busy: false, solved: false, finished: false, promotionChoices: [], canNext: true, canRetry: false });
  check(document.querySelectorAll("#board button").length === 64, "Отображаются 64 клетки");
  document.querySelector('[data-square="g6"]').click();
  check(selected === "g6", "Клик создаёт одно действие выбора");
  check(document.documentElement.scrollWidth <= document.documentElement.clientWidth, "Нет горизонтальной прокрутки");
  document.querySelector("#results").textContent = lines.join("\n");
} catch (error) {
  document.querySelector("#results").textContent = `FAIL: ${error.message}`;
  throw error;
}

