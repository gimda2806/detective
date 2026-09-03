'use server';

import {
  type InputMode,
  resetGame,
  stateView,
  submitMessage,
  uploadCaseMaster,
} from './game';

export async function getGameState(caseId: string) {
  return stateView(caseId);
}

export async function sendGameMessage(
  caseId: string,
  message: string,
  mode: InputMode,
) {
  return submitMessage(caseId, message, mode);
}

export async function resetGameState(caseId: string) {
  return resetGame(caseId);
}

export async function uploadMasterJson(jsonText: string) {
  return uploadCaseMaster(jsonText);
}
