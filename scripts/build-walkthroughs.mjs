// 마스터 JSON에서 사건별 공략집(스포일러 포함)을 만들어 낸다.
//
//   node scripts/build-walkthroughs.mjs            # 전부
//   node scripts/build-walkthroughs.mjs CASE316    # 하나만
//
// 왜 손으로 쓰지 않고 뽑아내는가: 2026-09-12에 253건을 손으로 써서
// 커밋한 브랜치가 있었는데(claude/nifty-hamilton-wbhcf2), 머지되지
// 못한 채 2주가 지나는 동안 대상 마스터 249건이 전부 수정됐다. 그중
// content/result/action이 바뀐 것만 148군데다. 마스터는 계속 고쳐지고
// 공략집은 따라오지 않으니, 그 시점부터 그 문서는 틀린 문서가 된다.
// 이 세션에서 실제로 틀린 주석 하나 때문에 버그를 놓친 적이 있어서,
// 틀린 문서는 없는 문서보다 나쁘다고 보고 생성 쪽으로 바꿨다.
//
// 그래서 결과물은 커밋하지 않는다(.gitignore). 필요할 때 돌리면
// 언제나 지금 마스터와 일치하고, 커버리지도 항상 100%다.

import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = 'data/pending-cases';

const list = (value) =>
  Array.isArray(value) ? value.filter(Boolean) : value ? [value] : [];
const join쉼표 = (value) => list(value).join(' / ');

function build(master) {
  const ci = master.case_identity || {};
  const truth = master.full_truth || {};
  const culpritId = truth.responsible_character_id;
  const byId = new Map(
    [...(master.characters || []), ...(master.key_figures || [])].map((p) => [
      p.id,
      p,
    ]),
  );
  const nameOf = (id) => byId.get(id)?.name || id;
  const out = [];
  const p = (line = '') => out.push(line);

  p(`# ${ci.title} — 공략집`);
  p();
  p(
    '> ⚠️ 스포일러 포함: 진범, 트릭, 결말을 전부 담고 있습니다. 직접 플레이할 계획이면 먼저 플레이한 뒤 참고하세요.',
  );
  p();
  p('> 이 파일은 마스터 JSON에서 자동 생성됩니다. 직접 고치지 마세요 —');
  p('> `npm run build:walkthroughs`를 다시 돌리면 덮어쓰입니다.');
  p();

  p('## 개요');
  p(`- **사건 ID**: ${ci.case_id}`);
  if (ci.english_title) p(`- **영문 제목**: ${ci.english_title}`);
  if (ci.setting) p(`- **배경**: ${ci.setting}`);
  if (ci.detective_entry)
    p(
      `- **탐정 진입 경위** (${ci.detective_entry_type}): ${ci.detective_entry}`,
    );
  const entryTime = master.opening_scene?.detective_entry_time;
  if (entryTime) p(`- **진입 시각**: ${entryTime}`);
  if (list(ci.tags).length)
    p(`- **태그**: ${list(ci.tags).map((t) => `#${t}`).join(' ')}`);
  p();

  if (list(master.key_figures).length) {
    p('## 핵심 인물 (피해자 등 · 면담 불가)');
    for (const k of master.key_figures) {
      p(`- **${k.name}** (${k.id}) — ${k.role} · 상태: ${k.status}`);
    }
    p();
  }

  p('## 등장인물');
  p('| ID | 이름 | 역할 | 초기 위치 | 비고 |');
  p('|---|---|---|---|---|');
  for (const c of master.characters || []) {
    const mark = c.id === culpritId ? '**진범**' : '';
    p(
      `| ${c.id} | ${c.name} | ${c.role || ''} | ${c.present_location || ''} | ${mark} |`,
    );
  }
  p();

  // relationships는 2026-09에 생긴 필드라 옛 사건에는 없다. 있을 때만 적는다.
  if (list(master.relationships).length) {
    p('## 인물 관계');
    for (const r of master.relationships) {
      const pair = list(r.between).map(nameOf).join(' ↔ ');
      p(`### ${r.id} · ${pair}`);
      p(`- 관계: ${r.nature}`);
      p(`- 겉으로는: ${r.public_face}`);
      p(`- 속사정: ${r.private_strain}`);
      p(`- 새어 나오는 때: ${r.surfaces_when}`);
      p();
    }
  }

  p('## 장소별 공략');
  for (const loc of master.locations || []) {
    p(`### ${loc.name} (${loc.id})`);
    if (loc.access) p(`- 접근: ${loc.access}`);
    if (loc.base_description) p(`- 설명: ${loc.base_description}`);
    for (const o of list(loc.observation_rules)) {
      p(`- 관찰 — "${o.action}" → ${o.result}`);
    }
    for (const d of list(loc.detail_rules)) {
      const got = d.release_evidence_id
        ? `**[${d.release_evidence_id}] 획득**: `
        : '';
      p(`- 조사 — "${d.action}" → ${got}${d.result}`);
    }
    p();
  }

  if (list(master.evidence).length) {
    p('## 증거 목록');
    p('| ID | 이름 | 종류 | 위치 | 획득 조건 |');
    p('|---|---|---|---|---|');
    for (const e of master.evidence) {
      p(
        `| ${e.id} | ${e.name} | ${e.source_type} | ${e.found_at} | ${e.discovery_condition} |`,
      );
    }
    p();
    for (const e of master.evidence) {
      p(`**[${e.id}] ${e.name}**`);
      p(`- 내용: ${e.content}`);
      if (list(e.proves).length) p(`- 증명: ${join쉼표(e.proves)}`);
      if (list(e.does_not_prove).length)
        p(`- 증명하지 않음: ${join쉼표(e.does_not_prove)}`);
      p();
    }
  }

  const stages = list(master.contradiction_stages);
  if (stages.length) {
    p(`## 공략 순서 — 진범 ${nameOf(culpritId)} 추궁하기`);
    for (const s of stages) {
      p(`### [${s.id}] ${s.from_stage} → ${s.to_stage}`);
      if (list(s.requires_heard_claim_ids).length)
        p(`- 필요 증언/사실: ${list(s.requires_heard_claim_ids).join(', ')}`);
      if (list(s.requires_presented_evidence_ids).length)
        p(`- 필요 증거: ${list(s.requires_presented_evidence_ids).join(', ')}`);
      if (s.requires_comparison) p(`- 비교 필요: ${s.requires_comparison}`);
      p(`- 행동: ${s.player_action}`);
      const scope =
        typeof s.release === 'string' ? s.release : s.release?.scope;
      if (scope) p(`- 결과: ${scope}`);
      p();
    }
  }

  if (list(master.red_herrings).length) {
    p('## 레드헤링 (가짜 용의자) 해소');
    for (const r of master.red_herrings) {
      p(`- **의심 정황**: ${r.surface_suspicion}`);
      p(`  - 실제로는: ${r.actual_reason}`);
      p(`  - 해소 방법: ${r.how_to_clear}`);
      if (r.suspicion_deepener) p(`  - (심화) ${r.suspicion_deepener}`);
      if (r.lingering_thread) p(`  - 여운: ${r.lingering_thread}`);
      p();
    }
  }

  const fd = master.final_deduction || {};
  p('## 최종 지목');
  p(`- **범인**: ${nameOf(culpritId)} (${culpritId})`);
  if (fd.method) p(`- 수법 근거: ${fd.method}`);
  if (fd.motive) p(`- 동기 근거: ${fd.motive}`);
  if (fd.key_connection) p(`- 연결 고리: ${fd.key_connection}`);
  p();

  p('## 진상 요약 (FULL TRUTH)');
  if (truth.motive) p(`- **동기**: ${truth.motive}`);
  if (truth.method) p(`- **수법**: ${truth.method}`);
  if (truth.key_time_location) p(`- **시각/장소**: ${truth.key_time_location}`);
  if (truth.cover_up) p(`- **은폐**: ${truth.cover_up}`);
  if (truth.accomplice) p(`- **공범**: ${truth.accomplice}`);
  p();

  if (list(master.ending_explanation).length) {
    p('## 엔딩 설명');
    for (const line of master.ending_explanation) p(`- ${line}`);
    p();
  }

  return out.join('\n').replace(/\n{3,}/g, '\n\n');
}

function main() {
  const only = process.argv.slice(2);
  const ids = (
    only.length
      ? only
      : readdirSync(ROOT).filter((name) => /^CASE\d+$/.test(name))
  ).sort();
  let written = 0;
  const skipped = [];
  for (const id of ids) {
    const masterPath = join(ROOT, id, `${id}.master.json`);
    if (!existsSync(masterPath)) {
      skipped.push(id);
      continue;
    }
    const master = JSON.parse(readFileSync(masterPath, 'utf8'));
    writeFileSync(join(ROOT, id, `${id}.walkthrough.md`), build(master));
    written += 1;
  }
  console.log(`공략집 ${written}건 생성 — ${ROOT}/<ID>/<ID>.walkthrough.md`);
  if (skipped.length) {
    console.log(`마스터가 없어 건너뜀: ${skipped.join(', ')}`);
  }
}

main();
