// ── Stone color ──
export type StoneColor = 'black' | 'white';

// ── Board position (0-indexed, (0,0) = top-left) ──
export interface Position {
  row: number; // 0–18
  col: number; // 0–18
}

// ── A single move record (stored in history for undo) ──
export interface MoveRecord {
  color: StoneColor;
  row: number;
  col: number;
  /** Opponent stones captured by this move */
  captured: Position[];
  /** Move numbers of captured stones (so undo can restore them) */
  capturedMoveNumbers: Array<{ row: number; col: number; moveNumber: number }>;
  /** Serialized board BEFORE this move was played */
  boardBefore: string;
  /** Serialized board from two moves ago (for ko-rule restoration on undo) */
  previousBoardState: string;
}

// ── Board marks ──
export type MarkType = 'CR' | 'SQ' | 'TR' | 'MA' | 'SL' | 'DD' | 'LB';
export type MarkTool = MarkType | 'ERASE';

export interface Mark {
  type: MarkType;
  row: number;
  col: number;
  label?: string; // only used when type === 'LB'
}

// ── Game tree node ──
export interface TreeNode {
  id: string;
  parentId: string | null; // null only for root
  childrenIds: string[]; // ordered; first child = main line
  move: MoveRecord | null; // null only for root
  marks?: Mark[]; // board marks on this node
}

// ── Full game state ──
export type Board = (StoneColor | null)[][];

export interface GameState {
  board: Board;
  currentPlayer: StoneColor;
  moveHistory: MoveRecord[];
  /** "row,col" → move number (1-indexed) for the current path */
  moveNumbers: Map<string, number>;
  /** Serialized board before the opponent's last move (for ko rule) */
  previousBoardState: string;
  capturedByBlack: number;
  capturedByWhite: number;
  showMoveNumbers: boolean;
  error: string | null;
  /** Game tree: all nodes keyed by id */
  treeNodes: Map<string, TreeNode>;
  /** Current position in the tree */
  currentNodeId: string;
  /** Comments keyed by node id */
  nodeComments: Map<string, string>;
  /** Setup mode */
  setupMode: boolean;
  setupColor: StoneColor;
  setupStones: { black: Position[]; white: Position[] };
  marksMode: boolean;
  markType: MarkTool;
  labelMode: boolean;
}

// ── Legality-check result ──
export interface LegalityResult {
  legal: boolean;
  reason?: string;
}

// ── Move-execution result ──
export interface MoveResult {
  board: Board;
  captured: Position[];
}

// ── SGF-related ──
export interface SGFMetadata {
  size: number;
  playerBlack?: string;
  playerWhite?: string;
  komi?: number;
}

export interface SGFMove {
  color: StoneColor;
  /** null = pass */
  position: Position | null;
}

// ── Parsed SGF tree (for loading) ──
export interface SGFNode {
  move: SGFMove | null; // null for root
  children: SGFNode[]; // first = main line, rest = branches
  comment?: string; // C[...] property
  setupStones?: { black: Position[]; white: Position[] };
  marks?: Mark[]; // board marks (CR, SQ, TR, MA, SL, DD)
}

// ── Reducer actions ──
export type GameAction =
  | { type: 'PLACE_STONE'; row: number; col: number }
  | { type: 'DELETE_NODE' }
  | { type: 'NAVIGATE_TO'; nodeId: string }
  | { type: 'TOGGLE_MOVE_NUMBERS' }
  | { type: 'LOAD_SGF'; sgfRoot: SGFNode }
  | { type: 'SET_ERROR'; message: string }
  | { type: 'SET_COMMENT'; comment: string }
  | { type: 'ENTER_SETUP_MODE' }
  | { type: 'SET_SETUP_COLOR'; color: StoneColor }
  | { type: 'PLACE_SETUP_STONE'; row: number; col: number }
  | { type: 'FINISH_SETUP' }
  | { type: 'NEW_GAME' }
  | { type: 'CLEAR_ERROR' }
  | { type: 'TOGGLE_MARKS_MODE' }
  | { type: 'SET_MARK_TYPE'; markType: MarkTool }
  | { type: 'PLACE_MARK'; row: number; col: number }
  | { type: 'TOGGLE_LABEL_MODE' }
  | { type: 'PLACE_LABEL'; row: number; col: number }
;
