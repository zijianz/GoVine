import { BOARD_SIZE } from './constants';
import type { Board, LegalityResult, MoveResult, Position, StoneColor } from './types';

// ── Direction deltas (up, down, left, right) ──
const DIRS: [number, number][] = [[-1, 0], [1, 0], [0, -1], [0, 1]];

// ── Board creation / cloning / serialization ──

export function createEmptyBoard(): Board {
  return Array.from({ length: BOARD_SIZE }, () =>
    Array.from({ length: BOARD_SIZE }, () => null)
  );
}

export function cloneBoard(board: Board): Board {
  return board.map(row => [...row]);
}

export function serializeBoard(board: Board): string {
  return board
    .map(row =>
      row.map(cell => (cell === 'black' ? 'B' : cell === 'white' ? 'W' : '.')).join('')
    )
    .join('/');
}

export function deserializeBoard(s: string): Board {
  return s.split('/').map(rowStr =>
    rowStr.split('').map(ch => {
      if (ch === 'B') return 'black';
      if (ch === 'W') return 'white';
      return null;
    })
  );
}

// ── Bounds check ──

function inBounds(row: number, col: number): boolean {
  return row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE;
}

function posKey(row: number, col: number): string {
  return `${row},${col}`;
}

// ── Group finding (BFS flood fill) ──

export function findGroup(board: Board, row: number, col: number): Position[] {
  const color = board[row]?.[col];
  if (!color) return [];

  const visited = new Set<string>();
  const queue: Position[] = [{ row, col }];
  const group: Position[] = [];

  visited.add(posKey(row, col));

  while (queue.length > 0) {
    const pos = queue.shift()!;
    group.push(pos);

    for (const [dr, dc] of DIRS) {
      const nr = pos.row + dr;
      const nc = pos.col + dc;
      const key = posKey(nr, nc);
      if (inBounds(nr, nc) && board[nr][nc] === color && !visited.has(key)) {
        visited.add(key);
        queue.push({ row: nr, col: nc });
      }
    }
  }

  return group;
}

// ── Liberty counting ──

export function countLiberties(board: Board, row: number, col: number): number {
  const color = board[row]?.[col];
  if (!color) return 0;

  const group = findGroup(board, row, col);
  const libertySet = new Set<string>();

  for (const { row: r, col: c } of group) {
    for (const [dr, dc] of DIRS) {
      const nr = r + dr;
      const nc = c + dc;
      if (inBounds(nr, nc) && board[nr][nc] === null) {
        libertySet.add(posKey(nr, nc));
      }
    }
  }

  return libertySet.size;
}

// ── Capture detection & execution ──

export function executeMove(
  board: Board,
  row: number,
  col: number,
  color: StoneColor
): MoveResult {
  const newBoard = cloneBoard(board);
  newBoard[row][col] = color;

  const opponent: StoneColor = color === 'black' ? 'white' : 'black';
  const captured: Position[] = [];
  const processedGroups = new Set<string>();

  // Check each orthogonal neighbor for opponent groups to capture
  for (const [dr, dc] of DIRS) {
    const nr = row + dr;
    const nc = col + dc;
    if (!inBounds(nr, nc)) continue;
    if (newBoard[nr][nc] !== opponent) continue;

    const key = posKey(nr, nc);
    if (processedGroups.has(key)) continue;

    const group = findGroup(newBoard, nr, nc);
    // Mark this group as processed (use all its stones' keys)
    for (const p of group) {
      processedGroups.add(posKey(p.row, p.col));
    }

    // Check liberties of this opponent group
    if (countLiberties(newBoard, nr, nc) === 0) {
      // Remove captured stones
      for (const p of group) {
        newBoard[p.row][p.col] = null;
        captured.push({ row: p.row, col: p.col });
      }
    }
  }

  return { board: newBoard, captured };
}

// ── Legality check (all rules in order) ──

export function isLegalMove(
  board: Board,
  row: number,
  col: number,
  color: StoneColor,
  previousBoardState: string
): LegalityResult {
  // 1. Bounds check
  if (!inBounds(row, col)) {
    return { legal: false, reason: 'Outside board boundaries' };
  }

  // 2. Occupied check
  if (board[row][col] !== null) {
    return { legal: false, reason: 'Intersection is already occupied' };
  }

  // 3. Simulate the move (place stone + capture opponent groups)
  const result = executeMove(board, row, col, color);

  // 4. Suicide check: the placed stone's group must have liberties
  //    (this happens when placing didn't capture anything AND own group has 0 liberties)
  if (result.captured.length === 0 && countLiberties(result.board, row, col) === 0) {
    return { legal: false, reason: 'Suicide is not allowed' };
  }

  // 5. Ko rule: the resulting board must differ from the board two moves ago
  const newBoardState = serializeBoard(result.board);
  if (previousBoardState && newBoardState === previousBoardState) {
    return { legal: false, reason: 'Ko: cannot repeat previous board position' };
  }

  return { legal: true };
}
