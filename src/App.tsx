import { useCallback, useMemo } from 'react';
import { useGame } from './hooks/useGame';
import { canDelete } from './state/gameReducer';
import { generateSGF } from './core/sgf';
import Board from './components/Board';
import Controls from './components/Controls';
import BranchDiagram from './components/BranchDiagram';
import type { SGFNode } from './core/types';
import './App.css';

export default function App() {
  const {
    state,
    placeStone,
    deleteNode,
    navigateTo,
    toggleMoveNumbers,
    clearError,
    setError,
    setComment,
    enterSetupMode,
    setSetupColor,
    placeSetupStone,
    finishSetup,
    loadSGF,
    newGame,
    saveSGF,
    toggleMarksMode,
    setMarkType,
    placeMark,
  } = useGame();

  const handleOpenFile = useCallback(
    (sgfRoot: SGFNode) => {
      loadSGF(sgfRoot);
    },
    [loadSGF]
  );

  const handleParseError = useCallback(
    (msg: string) => {
      setError(msg);
    },
    [setError]
  );

  const canDeleteNow = canDelete(state);
  const comment = state.nodeComments.get(state.currentNodeId) ?? '';
  const currentNodeMarks = state.treeNodes.get(state.currentNodeId)?.marks;

  // Click handler: setup mode → marks mode → play mode
  const handleCellClick = state.setupMode
    ? placeSetupStone
    : state.marksMode
      ? placeMark
      : placeStone;

  // Live SGF preview
  const sgfPreview = useMemo(
    () => generateSGF(state.treeNodes, state.nodeComments, state.setupStones, 'root'),
    [state.treeNodes, state.nodeComments, state.setupStones]
  );

  return (
    <div className="app-container">
      <h1 className="app-title">Go</h1>
      <div className="app-main">
        {/* Left: Comment box (hidden during setup) */}
        {!state.setupMode && (
          <textarea
            className="comment-panel"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Comment for this position…"
          />
        )}
        <Board
          board={state.board}
          moveNumbers={state.setupMode ? new Map() : state.moveNumbers}
          showMoveNumbers={state.setupMode ? false : state.showMoveNumbers}
          onCellClick={handleCellClick}
          currentPlayer={state.setupMode ? state.setupColor : state.currentPlayer}
          error={state.error}
          onErrorDismiss={clearError}
          marks={currentNodeMarks}
          marksMode={state.marksMode}
        />
        <div className="right-column">
          <Controls
            capturedByBlack={state.capturedByBlack}
            capturedByWhite={state.capturedByWhite}
            showMoveNumbers={state.showMoveNumbers}
            canDelete={canDeleteNow}
            moveCount={state.moveHistory.length}
            setupMode={state.setupMode}
            setupColor={state.setupColor}
            onDelete={deleteNode}
            onToggleMoveNumbers={toggleMoveNumbers}
            onSave={saveSGF}
            onOpenFile={handleOpenFile}
            onNewGame={newGame}
            onParseError={handleParseError}
            onEnterSetupMode={enterSetupMode}
            onSetSetupColor={setSetupColor}
            onFinishSetup={finishSetup}
            marksMode={state.marksMode}
            markType={state.markType}
            onToggleMarksMode={toggleMarksMode}
            onSetMarkType={setMarkType}
          />
          {!state.setupMode && (
            <BranchDiagram
              treeNodes={state.treeNodes}
              currentNodeId={state.currentNodeId}
              rootId="root"
              onNavigate={navigateTo}
              onDeleteLeaf={deleteNode}
            />
          )}
        </div>
      </div>
      {/* Bottom: SGF preview */}
      <textarea
        className="sgf-preview"
        value={sgfPreview}
        readOnly
        rows={4}
      />
    </div>
  );
}
