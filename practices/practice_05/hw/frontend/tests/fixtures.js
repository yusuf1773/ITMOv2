export const catalog = { tasks: [1, 2, 3, 4, 5].map((n) => ({ id: `task-0${n}` })) };
export const firstTask = { id: "task-01", fen: "7k/8/5KQ1/8/8/8/8/8 w - - 0 1" };
export const correct = { task_id: "task-01", result: "correct", fen_after: "7k/6Q1/5K2/8/8/8/8/8 b - - 1 1" };
export const illegal = { task_id: "task-01", result: "illegal", fen_after: null };

