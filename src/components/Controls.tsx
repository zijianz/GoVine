import { useRef, useCallback } from 'react';
import { parseSGFFile } from '../core/sgf';
import type { SGFNode, MarkTool } from '../core/types';
import './Controls.css';

interface ControlsProps {
  capturedByBlack: number;
  capturedByWhite: number;
  showMoveNumbers: boolean;
  canDelete: boolean;
  moveCount: number;
  setupMode: boolean;
  setupColor: 'black' | 'white';
  onDelete: () => void;
  onToggleMoveNumbers: () => void;
  onSave: () => void;
  onOpenFile: (sgfRoot: SGFNode) => void;
  onNewGame: () => void;
  onParseError: (msg: string) => void;
  onEnterSetupMode: () => void;
  onSetSetupColor: (color: 'black' | 'white') => void;
  onFinishSetup: () => void;
  marksMode: boolean;
  markType: MarkTool;
  onToggleMarksMode: () => void;
  onSetMarkType: (markType: MarkTool) => void;
}

export default function Controls({
  capturedByBlack,
  capturedByWhite,
  showMoveNumbers,
  canDelete,
  moveCount,
  setupMode,
  setupColor,
  onDelete,
  onToggleMoveNumbers,
  onSave,
  onOpenFile,
  onNewGame,
  onParseError,
  onEnterSetupMode,
  onSetSetupColor,
  onFinishSetup,
  marksMode,
  markType,
  onToggleMarksMode,
  onSetMarkType,
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
            Place Black
          </button>
          <button
            className={`btn ${setupColor === 'white' ? 'active' : ''}`}
            onClick={() => onSetSetupColor('white')}
          >
            Place White
          </button>
          <button className="btn btn-save" onClick={onFinishSetup}>
            Finish
          </button>
          <button className="btn btn-new-game" onClick={onNewGame}>
            Cancel
          </button>
        </div>
      </div>
    );
  }

  const deleteTitle = !canDelete
    ? 'Cannot delete the root position'
    : 'Delete this move and everything after it';

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
          New Game
        </button>

        <button className="btn" onClick={onEnterSetupMode}>
          Place Stones
        </button>

        <button className="btn btn-open" onClick={handleOpenClick}>
          Open
        </button>

        <button className="btn btn-save" onClick={onSave}>
          Save As
        </button>

        <button
          className="btn"
          disabled={!canDelete}
          onClick={onDelete}
          title={deleteTitle}
        >
          Delete
        </button>

        <button
          className={`btn ${showMoveNumbers ? 'active' : ''}`}
          onClick={onToggleMoveNumbers}
        >
          {showMoveNumbers ? 'Hide Idx' : 'Show Idx'}
        </button>

        <div className="marks-control">
          <button
            className={`btn marks-toggle ${marksMode ? 'active' : ''}`}
            onClick={onToggleMarksMode}
          >
            {marksMode && markType === 'ERASE' ? 'Eraser' : 'Marks'}
          </button>
          <select
            className="mark-type-select"
            value={markType}
            disabled={!marksMode}
            onChange={(e) => onSetMarkType(e.target.value as MarkTool)}
          >
            <option value="ERASE">⌫</option>
            <option value="CR">○</option>
            <option value="SQ">□</option>
            <option value="TR">△</option>
            <option value="MA">✕</option>
            <option value="SL">◆</option>
            <option value="DD">░</option>
          </select>
        </div>

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
