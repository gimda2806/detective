'use server';

// Server actions for the offline game only. Kept out of app/actions.ts so the
// existing AI game's action file stays untouched: this route's entry points
// can change without ever editing a file the model-driven game also uses.
//
// `actionId` is always an id the client was handed in available_actions, not
// free text — see app/gm/offline-engine.ts. The exception is case_close, which
// carries the player's own wording the same way it always has.

import {
  type InputMode,
  exportPlayLog,
  resetGame,
  stateView,
  submitMessage,
} from '../game';

export async function getOfflineGameState(caseId: string) {
  return stateView(caseId, undefined, 'offline');
}

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
