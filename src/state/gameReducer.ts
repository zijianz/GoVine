import {
  createEmptyBoard,
  isLegalMove,
  executeMove,
  serializeBoard,
} from '../core/gameLogic';
import type { GameState, GameAction, TreeNode, MoveRecord, SGFNode } from '../core/types';

// ── Node ID counter ──

let _nextNodeId = 1;
export function resetNodeIds(): void {
  _nextNodeId = 1;
}
function nextNodeId(): string {
  return 'n' + _nextNodeId++;
}

// ── Initial state ──

export function createInitialState(): GameState {
  resetNodeIds();
  const rootId = 'root';
  const root: TreeNode = {
    id: rootId,
    parentId: null,
    childrenIds: [],
    move: null,
  };
  const treeNodes = new Map<string, TreeNode>();
  treeNodes.set(rootId, root);

  return {
    board: createEmptyBoard(),
    currentPlayer: 'black',
    moveHistory: [],
    moveNumbers: new Map(),
    previousBoardState: '',
    capturedByBlack: 0,
    capturedByWhite: 0,
    showMoveNumbers: false,
    error: null,
    treeNodes,
    currentNodeId: rootId,
    nodeComments: new Map(),
    setupMode: false,
    setupColor: 'black',
    setupStones: { black: [], white: [] },
  };
}

// ── Derive board state by replaying moves along a path ──

export function deriveStateFromPath(
  treeNodes: Map<string, TreeNode>,
  currentNodeId: string,
  setupStones?: { black: { row: number; col: number }[]; white: { row: number; col: number }[] }
): Pick<
  GameState,
  'board' | 'currentPlayer' | 'moveHistory' | 'moveNumbers' | 'previousBoardState' | 'capturedByBlack' | 'capturedByWhite'
> {
  const path: string[] = [];
  let nid: string | null = currentNodeId;
  while (nid !== null) {
    path.unshift(nid);
    const node = treeNodes.get(nid);
    nid = node?.parentId ?? null;
  }

  let board = createEmptyBoard();

  // Place setup stones
  if (setupStones) {
    for (const s of setupStones.black) {
      board[s.row][s.col] = 'black';
    }
    for (const s of setupStones.white) {
      board[s.row][s.col] = 'white';
    }
  }

  let currentPlayer: 'black' | 'white' = 'black';
  const moveHistory: MoveRecord[] = [];
  const moveNumbers = new Map<string, number>();
  let previousBoardState = '';
  let capturedByBlack = 0;
  let capturedByWhite = 0;

  for (const id of path) {
    const node = treeNodes.get(id);
    if (!node || !node.move) continue;

    const { row, col, color } = node.move;
    const result = executeMove(board, row, col, color);

    const moveNum = moveHistory.length + 1;
    moveNumbers.set(`${row},${col}`, moveNum);
    for (const pos of result.captured) {
      moveNumbers.delete(`${pos.row},${pos.col}`);
    }

    previousBoardState = serializeBoard(board);
    board = result.board;

    if (color === 'black') capturedByBlack += result.captured.length;
    else capturedByWhite += result.captured.length;

    currentPlayer = color === 'black' ? 'white' : 'black';

    moveHistory.push({ ...node.move });
  }

  return { board, currentPlayer, moveHistory, moveNumbers, previousBoardState, capturedByBlack, capturedByWhite };
}

// ── Tree operations ──

export function deleteSubtree(treeNodes: Map<string, TreeNode>, nodeId: string): void {
  const node = treeNodes.get(nodeId);
  if (!node) return;
  for (const childId of node.childrenIds) {
    deleteSubtree(treeNodes, childId);
  }
  treeNodes.delete(nodeId);
}

export function buildTreeFromSGF(
  treeNodes: Map<string, TreeNode>,
  nodeComments: Map<string, string>,
  parentId: string,
  sgfNode: SGFNode
): string {
  const id = nextNodeId();
  let move: MoveRecord | null = null;

  if (sgfNode.move && sgfNode.move.position) {
    move = {
      color: sgfNode.move.color,
      row: sgfNode.move.position.row,
      col: sgfNode.move.position.col,
      captured: [],
      capturedMoveNumbers: [],
      boardBefore: '',
      previousBoardState: '',
    };
  }

  if (sgfNode.comment) {
    nodeComments.set(id, sgfNode.comment);
  }

  const treeNode: TreeNode = { id, parentId, childrenIds: [], move };
  treeNodes.set(id, treeNode);

  for (const childSGF of sgfNode.children) {
    const childId = buildTreeFromSGF(treeNodes, nodeComments, id, childSGF);
    treeNode.childrenIds.push(childId);
  }

  return id;
}

// ── Selectors ──

export function isAtLeafNode(state: GameState): boolean {
  const node = state.treeNodes.get(state.currentNodeId);
  return node ? node.childrenIds.length === 0 : true;
}

export function canRevert(state: GameState): boolean {
  return isAtLeafNode(state) && state.moveHistory.length > 0;
}

export function canNavigateBackward(state: GameState): boolean {
  const node = state.treeNodes.get(state.currentNodeId);
  return node ? node.parentId !== null : false;
}

export function canNavigateForward(state: GameState): boolean {
  const node = state.treeNodes.get(state.currentNodeId);
  return node ? node.childrenIds.length > 0 : false;
}

// ── Reducer ──

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'PLACE_STONE': {
      const { row, col } = action;
      const color = state.currentPlayer;

      const legal = isLegalMove(state.board, row, col, color, state.previousBoardState);
      if (!legal.legal) {
        return { ...state, error: legal.reason ?? 'Illegal move' };
      }

      const result = executeMove(state.board, row, col, color);

      const boardBefore = serializeBoard(state.board);
      const capturedMoveNumbers: MoveRecord['capturedMoveNumbers'] = [];
      for (const pos of result.captured) {
        const key = `${pos.row},${pos.col}`;
        const mn = state.moveNumbers.get(key);
        if (mn !== undefined) {
          capturedMoveNumbers.push({ ...pos, moveNumber: mn });
        }
      }

      const moveRecord: MoveRecord = {
        color, row, col,
        captured: result.captured,
        capturedMoveNumbers,
        boardBefore,
        previousBoardState: state.previousBoardState,
      };

      const newId = nextNodeId();
      const currentNode = state.treeNodes.get(state.currentNodeId)!;
      const newTreeNode: TreeNode = {
        id: newId,
        parentId: state.currentNodeId,
        childrenIds: [],
        move: moveRecord,
      };

      const newTreeNodes = new Map(state.treeNodes);
      newTreeNodes.set(newId, newTreeNode);

      const updatedParent: TreeNode = {
        ...currentNode,
        childrenIds: [...currentNode.childrenIds, newId],
      };
      newTreeNodes.set(state.currentNodeId, updatedParent);

      const newMoveNumbers = new Map(state.moveNumbers);
      const moveNum = state.moveHistory.length + 1;
      newMoveNumbers.set(`${row},${col}`, moveNum);
      for (const pos of result.captured) {
        newMoveNumbers.delete(`${pos.row},${pos.col}`);
      }

      return {
        ...state,
        board: result.board,
        currentPlayer: color === 'black' ? 'white' : 'black',
        moveHistory: [...state.moveHistory, moveRecord],
        moveNumbers: newMoveNumbers,
        previousBoardState: serializeBoard(state.board),
        capturedByBlack: state.capturedByBlack + (color === 'black' ? result.captured.length : 0),
        capturedByWhite: state.capturedByWhite + (color === 'white' ? result.captured.length : 0),
        treeNodes: newTreeNodes,
        currentNodeId: newId,
        error: null,
      };
    }

    case 'BRANCH': {
      const currentNode = state.treeNodes.get(state.currentNodeId);
      if (!currentNode || !currentNode.parentId) return state;

      const newCurrentNodeId = currentNode.parentId;
      const derived = deriveStateFromPath(state.treeNodes, newCurrentNodeId, state.setupStones);

      return { ...state, ...derived, error: null, currentNodeId: newCurrentNodeId };
    }

    case 'NAVIGATE_TO': {
      const target = state.treeNodes.get(action.nodeId);
      if (!target) return state;

      const derived = deriveStateFromPath(state.treeNodes, action.nodeId, state.setupStones);

      return { ...state, ...derived, currentNodeId: action.nodeId, error: null };
    }

    case 'NAVIGATE_BACKWARD': {
      const currentNode = state.treeNodes.get(state.currentNodeId);
      if (!currentNode || !currentNode.parentId) return state;

      const derived = deriveStateFromPath(state.treeNodes, currentNode.parentId, state.setupStones);

      return { ...state, ...derived, currentNodeId: currentNode.parentId, error: null };
    }

    case 'NAVIGATE_FORWARD': {
      const currentNode = state.treeNodes.get(state.currentNodeId);
      if (!currentNode || currentNode.childrenIds.length === 0) return state;

      const nextId = currentNode.childrenIds[0]; // main line = first child
      const derived = deriveStateFromPath(state.treeNodes, nextId, state.setupStones);

      return { ...state, ...derived, currentNodeId: nextId, error: null };
    }

    case 'REVERT': {
      const currentNode = state.treeNodes.get(state.currentNodeId);
      if (!currentNode || !currentNode.parentId) return state;

      const parentId = currentNode.parentId;
      const parentNode = state.treeNodes.get(parentId)!;
      const newTreeNodes = new Map(state.treeNodes);

      const shouldDelete = (() => {
        let nid: string | null = state.currentNodeId;
        while (nid !== null) {
          const n = state.treeNodes.get(nid);
          if (!n || n.parentId === null) break;
          const p = state.treeNodes.get(n.parentId);
          if (p && p.childrenIds[0] !== nid) return true;
          nid = n.parentId;
        }
        if (currentNode.childrenIds.length === 0 && parentNode.childrenIds.length === 1) {
          return true;
        }
        return false;
      })();

      if (shouldDelete) {
        deleteSubtree(newTreeNodes, state.currentNodeId);
        const updatedParent: TreeNode = {
          ...parentNode,
          childrenIds: parentNode.childrenIds.filter(id => id !== state.currentNodeId),
        };
        newTreeNodes.set(parentId, updatedParent);
      }

      const newCurrentNodeId = parentId;
      const derived = deriveStateFromPath(newTreeNodes, newCurrentNodeId, state.setupStones);

      return { ...state, ...derived, treeNodes: newTreeNodes, currentNodeId: newCurrentNodeId, error: null };
    }

    case 'TOGGLE_MOVE_NUMBERS':
      return { ...state, showMoveNumbers: !state.showMoveNumbers };

    case 'LOAD_SGF': {
      const newTreeNodes = new Map<string, TreeNode>();
      const newNodeComments = new Map<string, string>();

      // Extract setup stones from SGF root
      const setupStones = action.sgfRoot.setupStones || { black: [], white: [] };

      const rootId = 'root';
      resetNodeIds();
      const root: TreeNode = { id: rootId, parentId: null, childrenIds: [], move: null };
      newTreeNodes.set(rootId, root);

      for (const childSGF of action.sgfRoot.children) {
        const childId = buildTreeFromSGF(newTreeNodes, newNodeComments, rootId, childSGF);
        const rootNode = newTreeNodes.get(rootId)!;
        rootNode.childrenIds.push(childId);
      }

      // Stay at root so the board shows only setup stones, not the first move
      const currentNodeId = rootId;
      const derived = deriveStateFromPath(newTreeNodes, currentNodeId, setupStones);

      return {
        ...state,
        ...derived,
        treeNodes: newTreeNodes,
        currentNodeId,
        nodeComments: newNodeComments,
        setupStones,
        error: null,
      };
    }

    case 'ENTER_SETUP_MODE':
      return {
        ...createInitialState(),
        setupMode: true,
        setupColor: 'black',
        setupStones: { black: [], white: [] },
      };

    case 'SET_SETUP_COLOR':
      return { ...state, setupColor: action.color };

    case 'PLACE_SETUP_STONE': {
      const { row, col } = action;
      const board = state.board.map(r => [...r]);

      // Toggle: if stone already exists at this position with current color, remove it
      if (board[row][col] === state.setupColor) {
        board[row][col] = null;
      } else {
        board[row][col] = state.setupColor;
      }

      // Rebuild setup stones from the board
      const black: { row: number; col: number }[] = [];
      const white: { row: number; col: number }[] = [];
      for (let r = 0; r < 19; r++) {
        for (let c = 0; c < 19; c++) {
          if (board[r][c] === 'black') black.push({ row: r, col: c });
          else if (board[r][c] === 'white') white.push({ row: r, col: c });
        }
      }

      return { ...state, board, setupStones: { black, white } };
    }

    case 'FINISH_SETUP': {
      // Re-derive state with setup stones as the starting position
      const derived = deriveStateFromPath(state.treeNodes, state.currentNodeId, state.setupStones);
      // Reset tree to just root (no moves played yet)
      const rootId = 'root';
      resetNodeIds();
      const root: TreeNode = { id: rootId, parentId: null, childrenIds: [], move: null };
      const treeNodes = new Map<string, TreeNode>();
      treeNodes.set(rootId, root);
      return {
        ...state,
        ...derived,
        setupMode: false,
        treeNodes,
        currentNodeId: rootId,
        nodeComments: new Map(),
        moveHistory: [],
        moveNumbers: new Map(),
        previousBoardState: '',
        capturedByBlack: 0,
        capturedByWhite: 0,
        error: null,
      };
    }

    case 'NEW_GAME':
      return createInitialState();

    case 'SET_COMMENT': {
      const newComments = new Map(state.nodeComments);
      if (action.comment.trim()) {
        newComments.set(state.currentNodeId, action.comment);
      } else {
        newComments.delete(state.currentNodeId);
      }
      return { ...state, nodeComments: newComments };
    }

    case 'SET_ERROR':
      return { ...state, error: action.message };

    case 'CLEAR_ERROR':
      return { ...state, error: null };

    default:
      return state;
  }
}
