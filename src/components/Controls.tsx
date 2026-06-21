import { useRef, useCallback } from 'react';
import { parseSGFFile } from '../core/sgf';
import type { SGFNode } from '../core/types';
import './Controls.css';

interface ControlsProps {
  capturedByBlack: number;
  capturedByWhite: number;
  showMoveNumbers: boolean;
  canRevert: boolean;
  canBranch: boolean;
  canNavigateBackward: boolean;
  canNavigateForward: boolean;
  moveCount: number;
  isAtLeaf: boolean;
  setupMode: boolean;
  setupColor: 'black' | 'white';
  onRevert: () => void;
  onBranch: () => void;
  onNavigateBackward: () => void;
  onNavigateForward: () => void;
  onToggleMoveNumbers: () => void;
  onSave: () => void;
  onOpenFile: (sgfRoot: SGFNode) => void;
  onNewGame: () => void;
  onParseError: (msg: string) => void;
  onEnterSetupMode: () => void;
  onSetSetupColor: (color: 'black' | 'white') => void;
  onFinishSetup: () => void;
}

export default function Controls({
  capturedByBlack,
  capturedByWhite,
  showMoveNumbers,
  canRevert,
  canBranch,
  canNavigateBackward,
  canNavigateForward,
  moveCount,
  isAtLeaf,
  setupMode,
  setupColor,
  onRevert,
  onBranch,
  onNavigateBackward,
  onNavigateForward,
  onToggleMoveNumbers,
  onSave,
  onOpenFile,
  onNewGame,
  onParseError,
  onEnterSetupMode,
  onSetSetupColor,
  onFinishSetup,
}: ControlsProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleOpenClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = () => {
        const content = reader.result as string;
        try {
          const sgfRoot = parseSGFFile(content);
          if (!sgfRoot.children || sgfRoot.children.length === 0) {
            onParseError('SGF file contains no moves');
            return;
          }
          onOpenFile(sgfRoot);
        } catch {
          onParseError('Failed to parse SGF file');
        }
      };
      reader.onerror = () => {
        onParseError('Failed to read file');
      };
      reader.readAsText(file);

      e.target.value = '';
    },
    [onOpenFile, onParseError]
  );

  const handleNewGame = useCallback(() => {
    if (moveCount === 0 || window.confirm('Start a new game? Current game will be lost.')) {
      onNewGame();
    }
  }, [moveCount, onNewGame]);

  if (setupMode) {
    return (
      <div className="controls">
        <div className="game-info">
          <div className="setup-title">Setup Mode</div>
          <div className="setup-color">
            Placing: <strong>{setupColor === 'black' ? 'Black' : 'White'}</strong>
          </div>
        </div>
        <div className="button-group">
          <button
            className={`btn ${setupColor === 'black' ? 'active' : ''}`}
            onClick={() => onSetSetupColor('black')}
          >
            ● Place Black
          </button>
          <button
            className={`btn ${setupColor === 'white' ? 'active' : ''}`}
            onClick={() => onSetSetupColor('white')}
          >
            ○ Place White
          </button>
          <button className="btn btn-save" onClick={onFinishSetup}>
            ✓ Finish
          </button>
          <button className="btn btn-new-game" onClick={onNewGame}>
            ✗ Cancel
          </button>
        </div>
      </div>
    );
  }

  const revertTitle = !canRevert
    ? moveCount === 0
      ? 'No moves to revert'
      : !isAtLeaf
        ? 'Can only revert the last move'
        : ''
    : 'Undo the last move';

  const branchTitle = !canBranch
    ? moveCount === 0
      ? 'No moves to branch from'
      : !isAtLeaf
        ? 'Can only branch from the last move'
        : ''
    : 'Create a branch from the previous move';

  return (
    <div className="controls">
      {/* Game info */}
      <div className="game-info">
        <div className="capture-counts">
          <div>
            Black captures: <strong>{capturedByBlack}</strong>
          </div>
          <div>
            White captures: <strong>{capturedByWhite}</strong>
          </div>
        </div>
      </div>

      {/* Buttons */}
      <div className="button-group">
        <button className="btn btn-new-game" onClick={handleNewGame}>
          🆕 New Game
        </button>

        <button
          className={`btn ${showMoveNumbers ? 'active' : ''}`}
          onClick={onToggleMoveNumbers}
        >
          {showMoveNumbers ? '🔢 Hide Idx' : '🔢 Show Idx'}
        </button>

        <button
          className="btn"
          disabled={!canRevert}
          onClick={onRevert}
          title={revertTitle}
        >
          ↩ Revert
        </button>

        <button
          className="btn"
          disabled={!canBranch}
          onClick={onBranch}
          title={branchTitle}
        >
          ⎇ Branch
        </button>

        <button
          className="btn"
          disabled={!canNavigateBackward}
          onClick={onNavigateBackward}
          title={!canNavigateBackward ? 'Already at the first move' : 'Go back one move'}
        >
          ◀ Prev
        </button>

        <button
          className="btn"
          disabled={!canNavigateForward}
          onClick={onNavigateForward}
          title={!canNavigateForward ? 'Already at the last move' : 'Go forward one move'}
        >
          Next ▶
        </button>

        <button className="btn btn-save" onClick={onSave}>
          💾 Save As
        </button>

        <button className="btn btn-open" onClick={handleOpenClick}>
          📂 Open
        </button>

        <button className="btn" onClick={onEnterSetupMode}>
          ⚫ Place Stones
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept=".sgf"
          className="hidden-file-input"
          onChange={handleFileChange}
        />
      </div>
    </div>
  );
}
