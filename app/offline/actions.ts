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
  clearLineEdits,
  endInterview,
  exportLineEdits,
  exportPlayLog,
  openAuthorMode,
  requestHint,
  resetGame,
  saveLineEdit,
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

// 작업자 모드. 비밀번호 판정은 전부 서버에서 한다 — 번들에 값이 실리면
// 자물쇠가 아니다. 화면은 「열렸다/아니다」만 받는다.
export async function openOfflineAuthorMode(password: string) {
  return openAuthorMode(password);
}

export async function saveOfflineLineEdit(
  caseId: string,
  original: string,
  edited: string,
  password: string,
) {
  return saveLineEdit(caseId, original, edited, password);
}

export async function exportOfflineLineEdits(password: string) {
  return exportLineEdits(password);
}

export async function clearOfflineLineEdits(password: string) {
  return clearLineEdits(password);
}
