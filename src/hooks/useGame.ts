import { useReducer, useCallback } from 'react';
import { generateSGF } from '../core/sgf';
import { createInitialState, gameReducer } from '../state/gameReducer';
import type { SGFNode, MarkTool } from '../core/types';

export function useGame() {
  const [state, dispatch] = useReducer(gameReducer, null, createInitialState);

  const placeStone = useCallback((row: number, col: number) => {
    dispatch({ type: 'PLACE_STONE', row, col });
  }, []);

  const deleteNode = useCallback(() => {
    dispatch({ type: 'DELETE_NODE' });
  }, []);

  const navigateTo = useCallback((nodeId: string) => {
    dispatch({ type: 'NAVIGATE_TO', nodeId });
  }, []);

  const toggleMoveNumbers = useCallback(() => {
    dispatch({ type: 'TOGGLE_MOVE_NUMBERS' });
  }, []);

  const clearError = useCallback(() => {
    dispatch({ type: 'CLEAR_ERROR' });
  }, []);

  const loadSGF = useCallback((sgfRoot: SGFNode) => {
    dispatch({ type: 'LOAD_SGF', sgfRoot });
  }, []);

  const newGame = useCallback(() => {
    dispatch({ type: 'NEW_GAME' });
  }, []);

  const setError = useCallback((message: string) => {
    dispatch({ type: 'SET_ERROR', message });
  }, []);

  const setComment = useCallback((comment: string) => {
    dispatch({ type: 'SET_COMMENT', comment });
  }, []);

  const enterSetupMode = useCallback(() => {
    dispatch({ type: 'ENTER_SETUP_MODE' });
  }, []);

  const setSetupColor = useCallback((color: 'black' | 'white') => {
    dispatch({ type: 'SET_SETUP_COLOR', color });
  }, []);

  const placeSetupStone = useCallback((row: number, col: number) => {
    dispatch({ type: 'PLACE_SETUP_STONE', row, col });
  }, []);

  const finishSetup = useCallback(() => {
    dispatch({ type: 'FINISH_SETUP' });
  }, []);

  const toggleMarksMode = useCallback(() => {
    dispatch({ type: 'TOGGLE_MARKS_MODE' });
  }, []);

  const setMarkType = useCallback((markType: MarkTool) => {
    dispatch({ type: 'SET_MARK_TYPE', markType });
  }, []);

  const placeMark = useCallback((row: number, col: number) => {
    dispatch({ type: 'PLACE_MARK', row, col });
  }, []);

  /** Save current game as an SGF file */
  const saveSGF = useCallback(async () => {
    const sgfContent = generateSGF(state.treeNodes, state.nodeComments, state.setupStones, 'root');

    if ('showSaveFilePicker' in window) {
      try {
        const handle = await (window as any).showSaveFilePicker({
          suggestedName: 'game.sgf',
          types: [
            {
              description: 'SGF Files',
              accept: { 'application/x-go-sgf': ['.sgf'] },
            },
          ],
        });
        const writable = await handle.createWritable();
        await writable.write(sgfContent);
        await writable.close();
        return;
      } catch (err: any) {
        if (err?.name === 'AbortError') return;
      }
    }

    // Fallback download
    const blob = new Blob([sgfContent], { type: 'application/x-go-sgf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'game.sgf';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [state.treeNodes, state.nodeComments, state.setupStones]);

  return {
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
  };
}
