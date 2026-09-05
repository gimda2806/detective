'use server';

import {
  type InputMode,
  exportPlayLog,
  resetGame,
  stateView,
  submitMessage,
} from './game';

export async function getGameState(caseId: string) {
  return stateView(caseId);
}

export async function sendGameMessage(
  caseId: string,
  message: string,
  mode: InputMode,
  viaSuggestion?: boolean,
) {
  return submitMessage(caseId, message, mode, viaSuggestion);
}

export async function resetGameState(caseId: string) {
  return resetGame(caseId);
}

export async function downloadPlayLog(caseId: string) {
  return exportPlayLog(caseId);
}
