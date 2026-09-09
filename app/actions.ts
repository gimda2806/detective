'use server';

import {
  type ClientIntent,
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
  intent?: ClientIntent | null,
) {
  return submitMessage(caseId, message, mode, intent);
}

export async function resetGameState(caseId: string) {
  return resetGame(caseId);
}

export async function downloadPlayLog(caseId: string) {
  return exportPlayLog(caseId);
}
