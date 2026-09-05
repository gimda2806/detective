// Server-side counterpart to scripts/generate-case.mjs + ingest-case.mjs:
// generates a new CASE9xx master from a one-line seed, validates and
// self-QAs it, then saves it straight into D1 through the same
// uploadCaseMaster() path the Master Upload form uses. Like the CLI
// script, never returns the generated plot text to the caller.
//
// Split out of app/game.ts (which stays the GM runtime + case CRUD
// module) since case generation is a distinct, self-contained job
// pipeline: it only shares ensureSchema/builtInCases/normalizeCaseId/
// uploadCaseMaster/CaseActionResult with game.ts, and nothing in game.ts
// depends on this file back.
import { env } from 'cloudflare:workers';
import {
  generateCaseMaster,
  buildUploadEnvelope as buildGeneratedCaseEnvelope,
  type AttemptLogEntry,
  type GenerationProgress,
  type OnProgress,
  type ResumeFrom,
} from './case-generation';
import {
  builtInCases,
  ensureSchema,
  normalizeCaseId,
  uploadCaseMaster,
  type CaseActionResult,
} from '../game';

function generationStageLabel(
  stage: GenerationProgress,
  attempt: number,
  maxAttempts: number,
) {
  switch (stage) {
    case 'drafting':
      return `시도 ${attempt}/${maxAttempts} · 초안 생성 중 (1~3분 소요)`;
    case 'validating':
      return `시도 ${attempt}/${maxAttempts} · 구조 검증 중`;
    case 'qa_reviewing':
      return `시도 ${attempt}/${maxAttempts} · 자체 QA 검토 중`;
    case 'retrying':
      return `시도 ${attempt}/${maxAttempts} · 문제 발견, 재시도 준비 중`;
    default:
      return '진행 중';
  }
}

async function finalizeGenerationJob(
  jobId: string,
  fields: {
    status: 'ok' | 'failed';
    message: string;
    issues: string[];
    attemptLog: AttemptLogEntry[];
    casePath?: string;
    caseId?: string;
    masterText?: string;
  },
) {
  await env.DB.prepare(
    `UPDATE generation_jobs
     SET status = ?, stage = ?, message = ?, issues = ?, attempt_log = ?, case_path = ?, case_id = ?, master_text = ?, updated_at = ?
     WHERE id = ?`,
  )
    .bind(
      fields.status,
      fields.status === 'ok' ? '완료' : '실패',
      fields.message,
      JSON.stringify(fields.issues),
      JSON.stringify(fields.attemptLog),
      fields.casePath || null,
      fields.caseId || null,
      // A failed run's last draft is kept so a follow-up "이어서 재시도" can
      // repair it instead of restarting from the seed; a successful run's
      // master text is already persisted via uploadCaseMaster, so don't
      // duplicate it here.
      fields.status === 'failed' ? fields.masterText || null : null,
      new Date().toISOString(),
      jobId,
    )
    .run();
}

// jobId (a client-generated UUID) lets the browser poll getGenerationProgress()
// for live stage updates from a second request while this one is still
// running — D1 writes made here are visible to that concurrent read as
// soon as they commit, so no background/waitUntil execution is needed.
export async function generateCase(
  seed: string,
  jobId?: string,
  resumeJobId?: string,
  requestedCaseId?: string,
): Promise<CaseActionResult> {
  const trimmedSeed = seed.trim();
  if (!trimmedSeed) {
    return { ok: false, message: '사건 시드를 입력해 주세요.', issues: [] };
  }

  await ensureSchema();

  const usedIds = new Set<string>(Object.keys(builtInCases));
  const existing = await env.DB.prepare('SELECT id FROM cases').all<{
    id: string;
  }>();
  for (const row of existing.results || []) usedIds.add(row.id.toUpperCase());

  // A user-typed case number is checked for duplicates up front — before
  // spending anything on a running job row or an API call — rather than
  // silently falling back to an auto-picked id. Ignored when resuming: a
  // resumed run's id comes from its own prior attempt, not this field.
  let caseId: string | undefined;
  if (requestedCaseId?.trim() && !resumeJobId) {
    const normalized = normalizeCaseId(requestedCaseId);
    if (!/^CASE[0-9A-Z_-]{1,24}$/.test(normalized)) {
      return {
        ok: false,
        message: `"${requestedCaseId}"는 올바른 케이스 번호 형식이 아닙니다 (예: CASE905).`,
        issues: [],
      };
    }
    if (usedIds.has(normalized)) {
      return {
        ok: false,
        message: `${normalized}은(는) 이미 사용 중인 케이스 번호입니다.`,
        issues: [],
      };
    }
    caseId = normalized;
  }

  let resume: ResumeFrom | undefined;
  if (resumeJobId) {
    const priorJob = await env.DB.prepare(
      `SELECT case_id, master_text, issues FROM generation_jobs WHERE id = ?`,
    )
      .bind(resumeJobId)
      .first<{
        case_id: string | null;
        master_text: string | null;
        issues: string | null;
      }>();
    if (priorJob?.case_id && priorJob.master_text) {
      resume = {
        caseId: priorJob.case_id,
        masterText: priorJob.master_text,
        issues: priorJob.issues
          ? (JSON.parse(priorJob.issues) as string[])
          : [],
      };
    }
  }

  const now = new Date().toISOString();
  if (jobId) {
    await env.DB.prepare(
      `INSERT INTO generation_jobs
         (id, status, stage, attempt, max_attempts, message, issues, attempt_log, case_path, created_at, updated_at)
       VALUES (?, 'running', '시작 준비 중', 0, 0, NULL, NULL, NULL, NULL, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         status = 'running', stage = '시작 준비 중', attempt = 0, attempt_log = NULL, updated_at = excluded.updated_at`,
    )
      .bind(jobId, now, now)
      .run();
  }

  const onProgress: OnProgress = async (
    stage,
    attempt,
    maxAttempts,
    attemptLog,
  ) => {
    if (!jobId) return;
    await env.DB.prepare(
      `UPDATE generation_jobs
       SET stage = ?, attempt = ?, max_attempts = ?, attempt_log = ?, updated_at = ?
       WHERE id = ?`,
    )
      .bind(
        generationStageLabel(stage, attempt, maxAttempts),
        attempt,
        maxAttempts,
        JSON.stringify(attemptLog),
        new Date().toISOString(),
        jobId,
      )
      .run();
  };

  let result;
  try {
    result = await generateCaseMaster(trimmedSeed, usedIds, {
      onProgress,
      resume,
      caseId,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : '사건 생성 중 오류가 발생했습니다.';
    if (jobId) {
      await finalizeGenerationJob(jobId, {
        status: 'failed',
        message,
        issues: [],
        attemptLog: [],
      });
    }
    return { ok: false, message, issues: [] };
  }

  if (!result.ok) {
    const message = `${result.caseId} 생성 실패 (${result.attempts}회 시도).`;
    if (jobId) {
      await finalizeGenerationJob(jobId, {
        status: 'failed',
        message,
        issues: result.issues,
        attemptLog: result.attemptLog,
        caseId: result.caseId,
        masterText: result.masterText,
      });
    }
    return { ok: false, message, issues: result.issues };
  }

  const envelope = buildGeneratedCaseEnvelope(result.masterText);
  const uploadResult = await uploadCaseMaster(JSON.stringify(envelope));
  // Advisory (non-blocking) QA findings on the accepted draft — design
  // niceties, never anything that breaks play — appended for visibility
  // rather than dropped, since they never caused a retry.
  const message =
    uploadResult.ok && result.warnings.length
      ? `${uploadResult.message} (경고 ${result.warnings.length}건: ${result.warnings.join(' / ')})`
      : uploadResult.message;
  if (jobId) {
    await finalizeGenerationJob(jobId, {
      status: uploadResult.ok ? 'ok' : 'failed',
      message,
      issues: uploadResult.issues,
      attemptLog: result.attemptLog,
      casePath: uploadResult.path,
    });
  }
  return { ...uploadResult, message };
}
