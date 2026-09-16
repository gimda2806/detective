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

// --- Offline GM (/offline/<caseId>) -----------------------------------------
//
// Deliberately separate entry points rather than a variant argument on the
// four above: the AI route cannot reach the offline save row by accident,
// and the offline route needs no OPENAI_API_KEY to be set at all.

export async function getOfflineGameState(caseId: string) {
  return stateView(caseId, undefined, 'offline');
}

// `actionId` is an id the client was handed in available_actions, not free
// text — see app/gm/offline-engine.ts. The one exception is case_close,
// which carries the player's typed deduction the same way it always has.
export async function sendOfflineAction(
  caseId: string,
  actionId: string,
  mode: InputMode = 'play',
) {
  return submitMessage(caseId, actionId, mode, false, 'offline');
}

export async function resetOfflineGameState(caseId: string) {
  return resetGame(caseId, 'offline');
}

export async function downloadOfflinePlayLog(caseId: string) {
  return exportPlayLog(caseId, 'offline');
}
