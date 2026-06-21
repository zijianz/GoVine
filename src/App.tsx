import { useCallback, useMemo } from 'react';
import { useGame } from './hooks/useGame';
import { isAtLeafNode, canRevert, canNavigateBackward, canNavigateForward } from './state/gameReducer';
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
    revert,
    branch,
    navigateTo,
    navigateBackward,
    navigateForward,
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

  const isAtLeaf = isAtLeafNode(state);
  const canRevertNow = canRevert(state);
  const comment = state.nodeComments.get(state.currentNodeId) ?? '';

  // Click handler: setup mode vs play mode
  const handleCellClick = state.setupMode ? placeSetupStone : placeStone;

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
        />
        <div className="right-column">
          <Controls
            capturedByBlack={state.capturedByBlack}
            capturedByWhite={state.capturedByWhite}
            showMoveNumbers={state.showMoveNumbers}
            canRevert={canRevertNow}
            canBranch={canRevertNow}
            canNavigateBackward={canNavigateBackward(state)}
            canNavigateForward={canNavigateForward(state)}
            isAtLeaf={isAtLeaf}
            moveCount={state.moveHistory.length}
            setupMode={state.setupMode}
            setupColor={state.setupColor}
            onRevert={revert}
            onBranch={branch}
            onNavigateBackward={navigateBackward}
            onNavigateForward={navigateForward}
            onToggleMoveNumbers={toggleMoveNumbers}
            onSave={saveSGF}
            onOpenFile={handleOpenFile}
            onNewGame={newGame}
            onParseError={handleParseError}
            onEnterSetupMode={enterSetupMode}
            onSetSetupColor={setSetupColor}
            onFinishSetup={finishSetup}
          />
          {!state.setupMode && (
            <BranchDiagram
              treeNodes={state.treeNodes}
              currentNodeId={state.currentNodeId}
              rootId="root"
              onNavigate={navigateTo}
              onDeleteLeaf={revert}
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
