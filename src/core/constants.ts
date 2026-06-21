export const BOARD_SIZE = 19;

// ── SVG layout constants ──
export const PADDING = 30; // px around grid for coordinate labels
export const CELL_SIZE = 30; // px between grid lines
export const SVG_SIZE = PADDING * 2 + CELL_SIZE * (BOARD_SIZE - 1); // = 600
export const STONE_RADIUS = 14;

// ── Hoshi (star points) for 19×19 — (row, col), 0-indexed ──
export const STAR_POINTS: Array<[number, number]> = [
  [3, 3], [3, 9], [3, 15],
  [9, 3], [9, 9], [9, 15],
  [15, 3], [15, 9], [15, 15],
];

// ── Column labels (skip 'I' per Go tradition) ──
export const COL_LABELS = 'ABCDEFGHJKLMNOPQRST'.split('');

// ── Row labels 19 (top) → 1 (bottom) ──
export const ROW_LABELS = Array.from({ length: 19 }, (_, i) => String(19 - i));
