import type { SGFMetadata, SGFMove, SGFNode, TreeNode } from './types';

// ── Coordinate conversion ──
// Internal: (row=0, col=0) = top-left
// SGF: column letter (a-s), row letter (a-s) = top-left
//   "aa" = (0,0), "ss" = (18,18)

export function toSGFCoord(row: number, col: number): string {
  return String.fromCharCode(97 + col) + String.fromCharCode(97 + row);
}

export function fromSGFCoord(coord: string): { row: number; col: number } {
  return {
    col: coord.charCodeAt(0) - 97,
    row: coord.charCodeAt(1) - 97,
  };
}

// ═══════════════════════════════════════════════════════════════
// ── SGF Generator (recursive, tree-aware) ──
// ═══════════════════════════════════════════════════════════════

/**
 * Generate a complete SGF string from the game tree.
 */
export function generateSGF(
  treeNodes: Map<string, TreeNode>,
  nodeComments: Map<string, string>,
  setupStones: { black: { row: number; col: number }[]; white: { row: number; col: number }[] },
  rootId: string
): string {
  return '(;' + generateNode(treeNodes, nodeComments, setupStones, rootId) + ')';
}

function generateNode(
  treeNodes: Map<string, TreeNode>,
  nodeComments: Map<string, string>,
  setupStones: { black: { row: number; col: number }[]; white: { row: number; col: number }[] },
  nodeId: string
): string {
  const node = treeNodes.get(nodeId);
  if (!node) return '';

  if (node.move === null) {
    // Root: game metadata + setup stones (no leading ';')
    let result = 'GM[1]FF[4]SZ[19]KM[6.5]';
    if (setupStones.black.length > 0) {
      result += 'AB';
      for (const s of setupStones.black) {
        result += `[${toSGFCoord(s.row, s.col)}]`;
      }
    }
    if (setupStones.white.length > 0) {
      result += 'AW';
      for (const s of setupStones.white) {
        result += `[${toSGFCoord(s.row, s.col)}]`;
      }
    }
    // If root has >1 child, wrap all in (...) so they are siblings,
    // not a main-line chain. If exactly 1 child, use inline (standard).
    if (node.childrenIds.length > 1) {
      for (const childId of node.childrenIds) {
        const child = treeNodes.get(childId);
        if (child) {
          result += '(' + generateNode(treeNodes, nodeComments, setupStones, child.id) + ')';
        }
      }
    } else {
      result += generateChildren(treeNodes, nodeComments, setupStones, node);
    }
    return result;
  }

  // Move node
  const color = node.move.color === 'black' ? 'B' : 'W';
  const coord = toSGFCoord(node.move.row, node.move.col);
  let result = `;${color}[${coord}]`;
  // Emit comment if present
  const comment = nodeComments.get(nodeId);
  if (comment) {
    result += `C[${escapeSGF(comment)}]`;
  }
  result += generateChildren(treeNodes, nodeComments, setupStones, node);
  return result;
}

function generateChildren(
  treeNodes: Map<string, TreeNode>,
  nodeComments: Map<string, string>,
  setupStones: { black: { row: number; col: number }[]; white: { row: number; col: number }[] },
  node: TreeNode
): string {
  if (node.childrenIds.length === 0) return '';

  let result = '';
  // First child: main line (inline, no wrapping parens)
  const firstChild = treeNodes.get(node.childrenIds[0]);
  if (firstChild) {
    result += generateNode(treeNodes, nodeComments, setupStones, firstChild.id);
  }
  // Remaining children: branches (each wrapped in parentheses)
  for (let i = 1; i < node.childrenIds.length; i++) {
    const child = treeNodes.get(node.childrenIds[i]);
    if (child) {
      result += '(' + generateNode(treeNodes, nodeComments, setupStones, child.id) + ')';
    }
  }
  return result;
}

/** Escape special characters in SGF text values */
function escapeSGF(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/\]/g, '\\]');
}

// ═══════════════════════════════════════════════════════════════
// ── SGF Parser (recursive descent) ──
// ═══════════════════════════════════════════════════════════════

/**
 * Parse an SGF string into a tree structure.
 *
 * SGF grammar (simplified):
 *   Collection = "(" Sequence ")"
 *   Sequence   = Node { Node | Collection }
 *   Node       = ";" { Property }
 *
 * Sequential ";" nodes form a parent→child chain (main line).
 * "(...)" groups that appear after a node are additional children (branches)
 * of the preceding node.
 */
export function parseSGF(content: string): { sgfRoot: SGFNode; metadata: SGFMetadata } {
  const s = content.replace(/\s+/g, '');
  const metadata: SGFMetadata = { size: 19 };

  if (!s.startsWith('(')) {
    throw new Error('Invalid SGF: expected opening parenthesis');
  }

  // parseCollection returns an array of nodes in a chain.
  // We chain them and return the head.
  const result = parseCollection(s, 1, metadata);
  const nodes = result.nodes;

  if (nodes.length === 0) {
    return { sgfRoot: { move: null, children: [] }, metadata };
  }

  // Chain sequential nodes: each node's first child = next node
  for (let j = 0; j < nodes.length - 1; j++) {
    // Prepend the next node to children (so it's the first child = main line)
    nodes[j].children.unshift(nodes[j + 1]);
  }

  return { sgfRoot: nodes[0], metadata };
}

/**
 * Parse a collection (content between matching parentheses).
 * Returns an array of nodes. Sequential ";N" nodes are separate entries;
 * "(...)" groups are parsed and their nodes become additional children
 * of the last ";" node.
 */
function parseCollection(
  s: string,
  startIndex: number,
  metadata: SGFMetadata
): { nodes: SGFNode[]; nextIndex: number } {
  const nodes: SGFNode[] = [];
  let i = startIndex;

  while (i < s.length) {
    const ch = s[i];

    if (ch === ';') {
      // Parse a single node (properties until next structural delimiter)
      i++; // skip ';'
      const propResult = parseProperties(s, i, metadata);
      const sgfNode: SGFNode = {
        move: propResult.move,
        children: [],
        comment: propResult.comment || undefined,
      };
      // Collect setup stones on the root node
      if (propResult.setupBlack.length > 0 || propResult.setupWhite.length > 0) {
        sgfNode.setupStones = {
          black: propResult.setupBlack,
          white: propResult.setupWhite,
        };
      }
      i = propResult.nextIndex;

      // After parsing properties, collect any "(...)" child collections.
      // These are additional children (branches) of this node.
      while (i < s.length && s[i] === '(') {
        i++; // skip '('
        const childResult = parseCollection(s, i, metadata);
        // Chain the child collection's nodes
        if (childResult.nodes.length > 0) {
          for (let j = 0; j < childResult.nodes.length - 1; j++) {
            childResult.nodes[j].children.unshift(childResult.nodes[j + 1]);
          }
          sgfNode.children.push(childResult.nodes[0]);
        }
        i = childResult.nextIndex; // should be at ')'
        if (i < s.length && s[i] === ')') {
          i++; // skip ')'
        }
      }

      nodes.push(sgfNode);
    } else if (ch === ')') {
      // End of this collection
      return { nodes, nextIndex: i };
    } else {
      i++;
    }
  }

  return { nodes, nextIndex: i };
}

/**
 * Parse properties of a single node (between ';' and the next ';', '(', or ')').
 */
/** Read consecutive [...] values from s starting at i. Returns array of values and new index. */
function readBracketValues(s: string, i: number): { values: string[]; nextIndex: number } {
  const values: string[] = [];
  while (i < s.length && s[i] === '[') {
    const end = s.indexOf(']', i);
    if (end === -1) break;
    values.push(s.slice(i + 1, end));
    i = end + 1;
  }
  return { values, nextIndex: i };
}

function parseProperties(
  s: string,
  startIndex: number,
  metadata: SGFMetadata
): { move: SGFMove | null; comment: string; setupBlack: { row: number; col: number }[]; setupWhite: { row: number; col: number }[]; nextIndex: number } {
  let move: SGFMove | null = null;
  let comment = '';
  const setupBlack: { row: number; col: number }[] = [];
  const setupWhite: { row: number; col: number }[] = [];
  let i = startIndex;

  // Regex to match KEY at current position
  const keyRegex = /^([A-Z]+)/;

  while (i < s.length) {
    const ch = s[i];
    // Stop at structural delimiters
    if (ch === ';' || ch === '(' || ch === ')') break;

    // Try to match a property key
    const remaining = s.slice(i);
    const keyMatch = keyRegex.exec(remaining);
    if (!keyMatch) {
      i++;
      continue;
    }
    const key = keyMatch[1];
    i += keyMatch[0].length;

    // Read all [...] values for this key
    const { values, nextIndex } = readBracketValues(s, i);
    i = nextIndex;

    const firstVal = values[0] ?? '';

    switch (key) {
      case 'SZ':
        metadata.size = parseInt(firstVal, 10) || 19;
        break;
      case 'PB':
        metadata.playerBlack = firstVal;
        break;
      case 'PW':
        metadata.playerWhite = firstVal;
        break;
      case 'KM':
        metadata.komi = parseFloat(firstVal) || 0;
        break;
      case 'B':
        move = {
          color: 'black',
          position: firstVal.length >= 2 ? fromSGFCoord(firstVal) : null,
        };
        break;
      case 'W':
        move = {
          color: 'white',
          position: firstVal.length >= 2 ? fromSGFCoord(firstVal) : null,
        };
        break;
      case 'AB':
        for (const v of values) {
          if (v.length >= 2) setupBlack.push(fromSGFCoord(v));
        }
        break;
      case 'AW':
        for (const v of values) {
          if (v.length >= 2) setupWhite.push(fromSGFCoord(v));
        }
        break;
      case 'C':
        comment = firstVal;
        break;
    }
  }

  return { move, comment, setupBlack, setupWhite, nextIndex: i };
}

// ═══════════════════════════════════════════════════════════════
// ── Legacy convenience (still used by Controls for file loading) ──
// ═══════════════════════════════════════════════════════════════

/**
 * Parse SGF and return the root node (for LOAD_SGF action).
 */
export function parseSGFFile(content: string): SGFNode {
  const { sgfRoot } = parseSGF(content);
  return sgfRoot;
}
