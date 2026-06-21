import { useMemo } from 'react';
import type { TreeNode } from '../core/types';
import { COL_LABELS } from '../core/constants';
import './BranchDiagram.css';

interface BranchDiagramProps {
  treeNodes: Map<string, TreeNode>;
  currentNodeId: string;
  rootId: string;
  onNavigate: (nodeId: string) => void;
  onDeleteLeaf: () => void;
}

// Layout constants
const CELL_W = 36;
const CELL_H = 36;
const NODE_R = 10;
const PAD = 16;

interface LayoutNode {
  id: string;
  col: number;
  row: number;
  move: TreeNode['move'];
  parentId: string | null;
  isCurrent: boolean;
  isLeaf: boolean;
  /** true if parent has only this one child (no sibling branches) */
  isOnlyChild: boolean;
}

export default function BranchDiagram({
  treeNodes,
  currentNodeId,
  rootId,
  onNavigate,
  onDeleteLeaf,
}: BranchDiagramProps) {
  const { layoutNodes, maxCol, maxRow } = useMemo(() => {
    const result: LayoutNode[] = [];
    let nextCol = 1;

    function walk(nodeId: string, parentCol: number, depth: number, parentId: string | null, isFirst: boolean) {
      const node = treeNodes.get(nodeId);
      if (!node) return;

      let col: number;
      if (node.parentId === null) {
        col = 0;
      } else if (isFirst) {
        col = parentCol;
      } else {
        col = nextCol++;
      }

      // Determine if this node's parent has only one child
      let isOnlyChild = false;
      if (node.parentId !== null) {
        const parent = treeNodes.get(node.parentId);
        isOnlyChild = parent ? parent.childrenIds.length === 1 : false;
      }

      result.push({
        id: nodeId,
        col,
        row: depth,
        move: node.move,
        parentId,
        isCurrent: nodeId === currentNodeId,
        isLeaf: node.childrenIds.length === 0,
        isOnlyChild,
      });

      for (let i = 0; i < node.childrenIds.length; i++) {
        walk(node.childrenIds[i], col, depth + 1, nodeId, i === 0);
      }
    }

    walk(rootId, 0, 0, null, true);

    const maxCol = Math.max(...result.map(n => n.col), 0);
    const maxRow = Math.max(...result.map(n => n.row), 0);

    return { layoutNodes: result, maxCol, maxRow };
  }, [treeNodes, currentNodeId, rootId]);

  // Show root + all move nodes
  const displayNodes = layoutNodes.filter(n => n.move !== null || n.parentId === null);
  if (displayNodes.length === 0) return null;

  const svgW = (maxCol + 1) * CELL_W + PAD;
  const svgH = (maxRow + 1) * CELL_H + PAD;

  const nodeMap = new Map(layoutNodes.map(n => [n.id, n]));

  // Build edges
  const edges: JSX.Element[] = [];
  for (const node of layoutNodes) {
    if (!node.parentId) continue;
    const parent = nodeMap.get(node.parentId);
    if (!parent) continue;

    const x1 = parent.col * CELL_W + PAD;
    const y1 = parent.row * CELL_H + PAD;
    const x2 = node.col * CELL_W + PAD;
    const y2 = node.row * CELL_H + PAD;

    if (node.col === parent.col) {
      edges.push(
        <line
          key={`edge-${parent.id}-${node.id}`}
          x1={x1} y1={y1} x2={x2} y2={y2}
          stroke="#666" strokeWidth={1.5}
        />
      );
    } else {
      edges.push(
        <polyline
          key={`edge-${parent.id}-${node.id}`}
          points={`${x1},${y1} ${x2},${y1} ${x2},${y2}`}
          fill="none"
          stroke="#e94560"
          strokeWidth={1.5}
          strokeDasharray="4 2"
        />
      );
    }
  }

  // Forward/backward navigation within the current branch
  const currentNode = treeNodes.get(currentNodeId);
  const canGoBack = currentNode ? currentNode.parentId !== null : false;
  const canGoForward = currentNode ? currentNode.childrenIds.length > 0 : false;

  const handleBackward = () => {
    if (currentNode?.parentId) onNavigate(currentNode.parentId);
  };
  const handleForward = () => {
    if (currentNode && currentNode.childrenIds.length > 0) {
      onNavigate(currentNode.childrenIds[0]);
    }
  };

  return (
    <div className="branch-diagram">
      <div className="branch-nav">
        <button
          className="branch-nav-btn"
          disabled={!canGoBack}
          onClick={handleBackward}
          title="Previous move"
        >
          ◂
        </button>
        <button
          className="branch-nav-btn"
          disabled={!canGoForward}
          onClick={handleForward}
          title="Next move"
        >
          ▸
        </button>
      </div>
      <svg
        viewBox={`0 0 ${svgW} ${svgH}`}
        width={svgW}
        height={svgH}
        style={{ minWidth: svgW, minHeight: svgH }}
      >
        <defs>
          <radialGradient id="diag-black" cx="35%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#555" />
            <stop offset="100%" stopColor="#111" />
          </radialGradient>
          <radialGradient id="diag-white" cx="35%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#fff" />
            <stop offset="100%" stopColor="#ccc" />
          </radialGradient>
        </defs>

        {/* Edges */}
        {edges}

        {/* Nodes */}
        {displayNodes
          .map(n => {
            const cx = n.col * CELL_W + PAD;
            const cy = n.row * CELL_H + PAD;
            const isRoot = n.parentId === null && n.move === null;

            // Clicking the current _leaf_ node that has no siblings removes it
            const canDelete = n.isCurrent && n.isLeaf && n.isOnlyChild;

            // Root node: navigate to root (do nothing if already there)
            const handleClick = () => {
              if (canDelete) {
                onDeleteLeaf();
              } else if (isRoot && n.isCurrent) {
                // Already at root — no-op
                return;
              } else {
                onNavigate(n.id);
              }
            };

            // Root node rendering
            if (isRoot) {
              return (
                <g
                  key={`diag-${n.id}`}
                  onClick={handleClick}
                  style={{ cursor: n.isCurrent ? 'default' : 'pointer' }}
                  title="Go to starting position"
                >
                  {/* Invisible hit area */}
                  <circle cx={cx} cy={cy} r={NODE_R + 5} fill="transparent" stroke="none" />
                  {/* Root node — small gray square */}
                  <rect
                    x={cx - NODE_R}
                    y={cy - NODE_R}
                    width={NODE_R * 2}
                    height={NODE_R * 2}
                    rx={3}
                    fill="#555"
                    stroke={n.isCurrent ? '#e94560' : '#777'}
                    strokeWidth={n.isCurrent ? 2.5 : 0.8}
                  />
                  {/* Current indicator ring */}
                  {n.isCurrent && (
                    <circle
                      cx={cx}
                      cy={cy}
                      r={NODE_R + 3}
                      fill="none"
                      stroke="#e94560"
                      strokeWidth={1.5}
                      opacity={0.6}
                    />
                  )}
                  {/* "Home" symbol */}
                  <text
                    x={cx}
                    y={cy + 1}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fill="#ddd"
                    fontSize={9}
                    style={{ pointerEvents: 'none', userSelect: 'none' }}
                  >
                    ⌂
                  </text>
                </g>
              );
            }

            // Move node rendering
            const isBlack = n.move!.color === 'black';

            // Go-style coordinate (e.g. "B12", "Q4")
            const colLabel = COL_LABELS[n.move!.col];
            const rowLabel = String(19 - n.move!.row);
            const coord = `${colLabel}${rowLabel}`;

            return (
              <g
                key={`diag-${n.id}`}
                onClick={handleClick}
                style={{ cursor: 'pointer' }}
              >
                {/* Invisible hit area */}
                <circle cx={cx} cy={cy} r={NODE_R + 5} fill="transparent" stroke="none" />
                {/* Stone */}
                <circle
                  cx={cx}
                  cy={cy}
                  r={NODE_R}
                  fill={isBlack ? 'url(#diag-black)' : 'url(#diag-white)'}
                  stroke={n.isCurrent ? '#e94560' : '#555'}
                  strokeWidth={n.isCurrent ? 2.5 : 0.8}
                />
                {/* Current indicator ring */}
                {n.isCurrent && (
                  <circle
                    cx={cx}
                    cy={cy}
                    r={NODE_R + 3}
                    fill="none"
                    stroke="#e94560"
                    strokeWidth={1.5}
                    opacity={0.6}
                  />
                )}
                {/* Coordinate label */}
                <text
                  x={cx}
                  y={cy + 1}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill={isBlack ? '#fff' : '#333'}
                  fontSize={7}
                  fontWeight="bold"
                  style={{ pointerEvents: 'none', userSelect: 'none' }}
                >
                  {coord}
                </text>
              </g>
            );
          })}
      </svg>
    </div>
  );
}
