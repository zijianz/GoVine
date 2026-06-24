import { useState, useCallback, memo } from 'react';
import { BOARD_SIZE, PADDING, CELL_SIZE, SVG_SIZE, STONE_RADIUS, STAR_POINTS, COL_LABELS, ROW_LABELS } from '../core/constants';
import type { Board as BoardType, Mark } from '../core/types';
import './Board.css';

interface BoardProps {
  board: BoardType;
  moveNumbers: Map<string, number>;
  showMoveNumbers: boolean;
  onCellClick: (row: number, col: number) => void;
  currentPlayer: 'black' | 'white';
  error: string | null;
  onErrorDismiss: () => void;
  marks?: Mark[];
  marksMode?: boolean;
}

/** Convert intersection (row, col) to SVG pixel coordinates */
function toSvgX(col: number): number {
  return PADDING + col * CELL_SIZE;
}

function toSvgY(row: number): number {
  return PADDING + row * CELL_SIZE;
}

/** Convert SVG pixel coordinates to nearest intersection */
function toIntersection(svgX: number, svgY: number): { row: number; col: number } | null {
  const col = Math.round((svgX - PADDING) / CELL_SIZE);
  const row = Math.round((svgY - PADDING) / CELL_SIZE);
  if (row < 0 || row >= BOARD_SIZE || col < 0 || col >= BOARD_SIZE) return null;
  return { row, col };
}

const Board = memo(function Board({
  board,
  moveNumbers,
  showMoveNumbers,
  onCellClick,
  currentPlayer,
  error,
  onErrorDismiss,
  marks,
  marksMode,
}: BoardProps) {
  const [hoveredCell, setHoveredCell] = useState<{ row: number; col: number } | null>(null);

  const handleClick = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      const svg = e.currentTarget;
      const rect = svg.getBoundingClientRect();
      const scale = SVG_SIZE / rect.width;
      const svgX = (e.clientX - rect.left) * scale;
      const svgY = (e.clientY - rect.top) * scale;
      const inter = toIntersection(svgX, svgY);
      if (inter) {
        onCellClick(inter.row, inter.col);
      }
    },
    [onCellClick]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      const svg = e.currentTarget;
      const rect = svg.getBoundingClientRect();
      const scale = SVG_SIZE / rect.width;
      const svgX = (e.clientX - rect.left) * scale;
      const svgY = (e.clientY - rect.top) * scale;
      const inter = toIntersection(svgX, svgY);
      setHoveredCell(inter);
    },
    []
  );

  const handleMouseLeave = useCallback(() => {
    setHoveredCell(null);
  }, []);

  const handleErrorClick = useCallback(() => {
    onErrorDismiss();
  }, [onErrorDismiss]);

  // Build grid lines
  const gridLines: JSX.Element[] = [];
  for (let i = 0; i < BOARD_SIZE; i++) {
    const pos = PADDING + i * CELL_SIZE;
    gridLines.push(
      <line
        key={`h-${i}`}
        x1={PADDING}
        y1={pos}
        x2={PADDING + (BOARD_SIZE - 1) * CELL_SIZE}
        y2={pos}
        stroke="#333"
        strokeWidth={1}
      />
    );
    gridLines.push(
      <line
        key={`v-${i}`}
        x1={pos}
        y1={PADDING}
        x2={pos}
        y2={PADDING + (BOARD_SIZE - 1) * CELL_SIZE}
        stroke="#333"
        strokeWidth={1}
      />
    );
  }

  // Edge border (thicker border on the outer edges)
  const outerR = PADDING;
  const outerB = PADDING + (BOARD_SIZE - 1) * CELL_SIZE;

  // Build stones
  const stones: JSX.Element[] = [];
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      const color = board[r][c];
      if (!color) continue;

      const cx = toSvgX(c);
      const cy = toSvgY(r);
      const key = `${r},${c}`;
      const moveNum = moveNumbers.get(key);

      stones.push(
        <g key={`stone-${key}`}>
          <circle
            cx={cx}
            cy={cy}
            r={STONE_RADIUS}
            fill={color === 'black' ? 'url(#black-stone)' : 'url(#white-stone)'}
            stroke="#333"
            strokeWidth={0.5}
          />
          {showMoveNumbers && moveNum !== undefined && (
            <text
              x={cx}
              y={cy + 1}
              textAnchor="middle"
              dominantBaseline="central"
              fill={color === 'black' ? '#fff' : '#000'}
              fontSize={moveNum > 99 ? 9 : 11}
              className="move-number"
            >
              {moveNum}
            </text>
          )}
        </g>
      );
    }
  }

  // Hover preview stone (only in play mode, not marks/setup)
  let hoverStone: JSX.Element | null = null;
  if (!marksMode && hoveredCell && board[hoveredCell.row][hoveredCell.col] === null) {
    const hx = toSvgX(hoveredCell.col);
    const hy = toSvgY(hoveredCell.row);
    hoverStone = (
      <circle
        cx={hx}
        cy={hy}
        r={STONE_RADIUS}
        fill={currentPlayer === 'black' ? 'rgba(0,0,0,0.35)' : 'rgba(255,255,255,0.45)'}
        stroke="none"
        pointerEvents="none"
      />
    );
  }

  return (
    <div className="board-wrapper">
      <svg
        className="board-svg"
        viewBox={`0 0 ${SVG_SIZE} ${SVG_SIZE}`}
        onClick={handleClick}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        <defs>
          <radialGradient id="black-stone" cx="35%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#555" />
            <stop offset="60%" stopColor="#222" />
            <stop offset="100%" stopColor="#111" />
          </radialGradient>
          <radialGradient id="white-stone" cx="35%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#fff" />
            <stop offset="60%" stopColor="#eee" />
            <stop offset="100%" stopColor="#ccc" />
          </radialGradient>
        </defs>

        {/* Grid lines */}
        {gridLines}

        {/* Edge border (thicker) */}
        <rect
          x={outerR}
          y={outerR}
          width={outerB - outerR}
          height={outerB - outerR}
          fill="none"
          stroke="#333"
          strokeWidth={2}
        />

        {/* Star points */}
        {STAR_POINTS.map(([r, c]) => (
          <circle
            key={`star-${r}-${c}`}
            cx={toSvgX(c)}
            cy={toSvgY(r)}
            r={3.5}
            fill="#333"
          />
        ))}

        {/* Stones */}
        {stones}

        {/* Marks */}
        {marks && marks.length > 0 && (
          <g className="marks-layer">
            {marks.map((mark, i) => {
              const cx = toSvgX(mark.col);
              const cy = toSvgY(mark.row);
              const onBlack = board[mark.row]?.[mark.col] === 'black';
              const accent = mark.type === 'DD' ? 'rgba(128,128,128,0.35)' : onBlack ? '#f0f0f0' : '#1a1a1a';
              const key = `mark-${mark.type}-${mark.row}-${mark.col}-${i}`;

              switch (mark.type) {
                case 'CR':
                  return (
                    <circle
                      key={key}
                      cx={cx} cy={cy} r={9}
                      fill="none" stroke={accent} strokeWidth={2}
                      pointerEvents="none"
                    />
                  );
                case 'SQ':
                  return (
                    <rect
                      key={key}
                      x={cx - 9} y={cy - 9} width={18} height={18}
                      fill="none" stroke={accent} strokeWidth={2}
                      pointerEvents="none"
                    />
                  );
                case 'TR':
                  return (
                    <polygon
                      key={key}
                      points={`${cx},${cy - 10} ${cx + 9},${cy + 6} ${cx - 9},${cy + 6}`}
                      fill="none" stroke={accent} strokeWidth={2}
                      pointerEvents="none"
                    />
                  );
                case 'MA':
                  return (
                    <g key={key} pointerEvents="none">
                      <line x1={cx - 7} y1={cy - 7} x2={cx + 7} y2={cy + 7}
                        stroke={accent} strokeWidth={2} />
                      <line x1={cx + 7} y1={cy - 7} x2={cx - 7} y2={cy + 7}
                        stroke={accent} strokeWidth={2} />
                    </g>
                  );
                case 'SL':
                  return (
                    <rect
                      key={key}
                      x={cx - 5} y={cy - 5} width={10} height={10}
                      fill={accent} stroke="none"
                      pointerEvents="none"
                    />
                  );
                case 'DD':
                  return (
                    <rect
                      key={key}
                      x={cx - CELL_SIZE / 2} y={cy - CELL_SIZE / 2}
                      width={CELL_SIZE} height={CELL_SIZE}
                      fill="rgba(128,128,128,0.35)"
                      stroke="rgba(128,128,128,0.5)"
                      strokeWidth={1}
                      pointerEvents="none"
                    />
                  );
                default:
                  return null;
              }
            })}
          </g>
        )}

        {/* Hover preview */}
        {hoverStone}

        {/* Coordinate labels */}
        {COL_LABELS.map((label, i) => (
          <text
            key={`col-top-${i}`}
            x={toSvgX(i)}
            y={14}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize={10}
            fill="#333"
            style={{ userSelect: 'none', pointerEvents: 'none' }}
          >
            {label}
          </text>
        ))}
        {COL_LABELS.map((label, i) => (
          <text
            key={`col-bot-${i}`}
            x={toSvgX(i)}
            y={SVG_SIZE - 14}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize={10}
            fill="#333"
            style={{ userSelect: 'none', pointerEvents: 'none' }}
          >
            {label}
          </text>
        ))}
        {ROW_LABELS.map((label, i) => (
          <text
            key={`row-left-${i}`}
            x={14}
            y={toSvgY(i)}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize={10}
            fill="#333"
            style={{ userSelect: 'none', pointerEvents: 'none' }}
          >
            {label}
          </text>
        ))}
        {ROW_LABELS.map((label, i) => (
          <text
            key={`row-right-${i}`}
            x={SVG_SIZE - 14}
            y={toSvgY(i)}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize={10}
            fill="#333"
            style={{ userSelect: 'none', pointerEvents: 'none' }}
          >
            {label}
          </text>
        ))}

        {/* Error overlay */}
        {error && (
          <g className="error-overlay" onClick={handleErrorClick}>
            <rect
              x={0}
              y={SVG_SIZE / 2 - 30}
              width={SVG_SIZE}
              height={60}
              fill="rgba(180,0,0,0.85)"
            />
            <text
              x={SVG_SIZE / 2}
              y={SVG_SIZE / 2 + 1}
              textAnchor="middle"
              dominantBaseline="central"
              fill="#fff"
              fontSize={15}
              fontWeight="bold"
              style={{ pointerEvents: 'none', userSelect: 'none' }}
            >
              {error}
            </text>
            <text
              x={SVG_SIZE / 2}
              y={SVG_SIZE / 2 + 18}
              textAnchor="middle"
              dominantBaseline="central"
              fill="rgba(255,255,255,0.6)"
              fontSize={10}
              style={{ pointerEvents: 'none', userSelect: 'none' }}
            >
              (click to dismiss)
            </text>
          </g>
        )}
      </svg>
    </div>
  );
});

export default Board;
