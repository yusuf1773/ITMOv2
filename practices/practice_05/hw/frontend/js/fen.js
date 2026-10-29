const PIECES = {
  K: ["♔", "белый король", "white"], Q: ["♕", "белый ферзь", "white"], R: ["♖", "белая ладья", "white"], B: ["♗", "белый слон", "white"], N: ["♘", "белый конь", "white"], P: ["♙", "белая пешка", "white"],
  k: ["♚", "чёрный король", "black"], q: ["♛", "чёрный ферзь", "black"], r: ["♜", "чёрная ладья", "black"], b: ["♝", "чёрный слон", "black"], n: ["♞", "чёрный конь", "black"], p: ["♟", "чёрная пешка", "black"],
};
const fail = (reason) => ({ ok: false, reason });

export function parseFenForDisplay(fen) {
  if (typeof fen !== "string") return fail("FEN должен быть строкой");
  const fields = fen.split(" ");
  if (fields.length !== 6 || !/^[wb]$/.test(fields[1]) || !/^(?:-|[KQkq]+)$/.test(fields[2]) || !/^(?:-|[a-h][36])$/.test(fields[3]) || !/^\d+$/.test(fields[4]) || !/^[1-9]\d*$/.test(fields[5])) return fail("FEN должен содержать шесть корректных полей");
  const rows = fields[0].split("/");
  if (rows.length !== 8) return fail("FEN должен содержать восемь рядов");
  const cells = [];
  for (let rowIndex = 0; rowIndex < 8; rowIndex += 1) {
    const rank = 8 - rowIndex;
    let file = 0;
    for (const token of rows[rowIndex]) {
      if (/^[1-8]$/.test(token)) {
        const amount = Number(token);
        for (let offset = 0; offset < amount; offset += 1) {
          if (file >= 8) return fail("Слишком длинный ряд FEN");
          cells.push({ square: `${String.fromCharCode(97 + file)}${rank}`, piece: null });
          file += 1;
        }
      } else if (PIECES[token]) {
        if (file >= 8) return fail("Слишком длинный ряд FEN");
        const [symbol, name, color] = PIECES[token];
        cells.push({ square: `${String.fromCharCode(97 + file)}${rank}`, piece: { symbol, name, color, fen: token } });
        file += 1;
      } else return fail("Неизвестная фигура в FEN");
    }
    if (file !== 8) return fail("Каждый ряд FEN должен содержать восемь клеток");
  }
  return { ok: true, value: { cells, sideToMove: fields[1] === "w" ? "white" : "black", castling: fields[2], enPassant: fields[3] } };
}

