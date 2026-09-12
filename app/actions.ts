'use server';

import {
  type ClientIntent,
  type Dialogue,
  type InputMode,
  endInterview,
  exportPlayLog,
  resetGame,
  stateView,
  submitMessage,
  toggleBookmark,
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

export async function endInterviewState(caseId: string) {
  return endInterview(caseId);
}

export async function toggleBookmarkState(
  caseId: string,
  content: string,
  role: Dialogue['role'],
) {
  return toggleBookmark(caseId, content, role);
}

export async function downloadPlayLog(caseId: string) {
  return exportPlayLog(caseId);
}
