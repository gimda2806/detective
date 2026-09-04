'use server';

import { env } from 'cloudflare:workers';
import {
  type InputMode,
  exportPlayLog,
  generateCase,
  getGenerationProgress,
  resetGame,
  stateView,
  submitMessage,
  uploadCaseMaster,
} from './game';

// Gates the two actions that write into production D1 / spend OpenAI
// credits (case upload, case generation) behind a shared admin token. If
// ADMIN_TOKEN isn't configured, these stay open — set it in the Worker's
// runtime secrets to lock them down.
function isAuthorized(token: string) {
  return Boolean(env.ADMIN_TOKEN) && token === env.ADMIN_TOKEN;
}

const UNAUTHORIZED_RESULT = {
  ok: false as const,
  message: '관리자 토큰이 올바르지 않습니다.',
  issues: [] as string[],
};

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

export async function uploadMasterJson(jsonText: string, token: string) {
  if (!isAuthorized(token)) return UNAUTHORIZED_RESULT;
  return uploadCaseMaster(jsonText);
}

export async function generateCaseFromSeed(
  seed: string,
  token: string,
  jobId: string,
) {
  if (!isAuthorized(token)) return UNAUTHORIZED_RESULT;
  return generateCase(seed, jobId);
}

// Read-only progress lookup, deliberately not token-gated: jobId is a
// client-generated UUID (an unguessable capability, not a resource
// listing), and its stage text carries no plot content.
export async function getCaseGenerationProgress(jobId: string) {
  return getGenerationProgress(jobId);
}

export async function downloadPlayLog(caseId: string) {
  return exportPlayLog(caseId);
}
