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
  endInterview,
  exportPlayLog,
  requestHint,
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
  return submitMessage(caseId, actionId, mode, null, 'offline');
}

export async function resetOfflineGameState(caseId: string) {
  return resetGame(caseId, 'offline');
}

export async function downloadOfflinePlayLog(caseId: string) {
  return exportPlayLog(caseId, 'offline');
}

export async function endOfflineInterview(caseId: string) {
  return endInterview(caseId, 'offline');
}

// 막혔을 때 누르는 버튼. 상태를 바꾸지 않고 한 칸만 알려준다. 규칙으로
// 고르는 것이라 모델을 부르지 않으므로 오프라인에서도 그대로 쓴다.
export async function requestOfflineHint(caseId: string) {
  return requestHint(caseId, 'offline');
}
