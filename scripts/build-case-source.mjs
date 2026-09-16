#!/usr/bin/env node
// 마스터에서 이야기 소스(.source.md)를 뽑아낸다.
//
// case_identity의 setting/tone/detective_entry와 full_truth의 산문 다섯은
// 런타임이 한 번도 읽지 않는다 — master-index.ts의 파싱 대상 12개 섹션에
// CASE_IDENTITY와 FULL_TRUTH가 없고(FULL_TRUTH에서는
// responsible_character_id 하나만 readField로 꺼낸다),
// buildActionScopedMaster도 싣지 않는다. 마스터를 "쓰기 위한" 재료이지
// 마스터가 "담아야 할" 데이터가 아니다.
//
// 그래서 그 여덟을 별도 파일로 뺀다. 이 스크립트는 이미 머지된 사건들의
// 소스 파일을 마스터에서 역추출하는 용도다 — 손으로 다시 쓸 이유가 없다.
// 새 사건은 반대 방향으로 간다: 소스를 먼저 쓰고, 그걸 재료로 마스터를 만든다.
//
//   node scripts/build-case-source.mjs CASE302     한 건
//   node scripts/build-case-source.mjs --all       전부
//   node scripts/build-case-source.mjs --all --dry 쓰지 않고 대상만 센다

import fs from 'node:fs';
import path from 'node:path';

const PENDING = path.join(process.cwd(), 'data', 'pending-cases');

// 소스의 어느 대목이 마스터의 어느 필드가 되는지. 2단계(구조화)를 하는
// 사람·모델이 매번 되짚지 않도록 파일 안에 같이 적어 둔다.
const MAPPING = [
  ['배경', '`locations[]`, `characters[].role`, `relationships[]`'],
  ['톤', '`opening_scene.narrative`, `ending_scene.narrative`'],
  ['탐정의 진입', '`opening_scene.narrative`, `opening_scene.detective_entry_time`'],
  ['동기', '`contradiction_stages`, `red_herrings`, `final_deduction.motive`'],
  ['수법', '`actual_timeline`, `evidence[]`, `final_deduction.method`'],
  ['결정적 시각·장소', '`actual_timeline`, `final_deduction.key_connection`'],
  ['은폐', '`actual_timeline`의 은폐 항목, `red_herrings`, `characters[].initial_claims`'],
];

function section(title, body) {
  const text = (body || '').trim();
  return text ? `## ${title}\n\n${text}\n` : '';
}

function build(master) {
  const ci = master.case_identity || {};
  const ft = master.full_truth || {};
  const culpritId = ft.responsible_character_id || '';
  const culprit = (master.characters || []).find((c) => c.id === culpritId);
  const culpritLabel = culprit ? `${culprit.name} (${culpritId})` : culpritId || '(미지정)';

  const truth = [
    `**진범**: ${culpritLabel}`,
    ft.accomplice && ft.accomplice !== '없음' ? `**공범**: ${ft.accomplice}` : '**공범**: 없음',
    '',
    ft.motive ? `### 동기\n\n${ft.motive.trim()}\n` : '',
    ft.method ? `### 수법\n\n${ft.method.trim()}\n` : '',
    ft.key_time_location ? `### 결정적 시각·장소\n\n${ft.key_time_location.trim()}\n` : '',
    ft.cover_up ? `### 은폐\n\n${ft.cover_up.trim()}\n` : '',
  ]
    .filter(Boolean)
    .join('\n');

  return [
    `# ${ci.case_id} — ${ci.title || ''}`.trim(),
    '',
    [
      '> 마스터를 쓰기 위한 **이야기 소스**다. 서버는 이 파일을 읽지 않는다 —',
      '> `app/game.ts`의 케이스 로더가 `*.master.json`만 훑기 때문에 번들에도',
      '> 들어가지 않는다. 여기 적힌 것을 재료로 같은 폴더의 `.master.json`을 채운다.',
    ].join('\n'),
    '',
    section('배경', ci.setting),
    section('톤', ci.tone),
    section(
      '탐정의 진입',
      [ci.detective_entry_type ? `- 경로: \`${ci.detective_entry_type}\`` : '', '', ci.detective_entry]
        .filter((line) => line !== null)
        .join('\n'),
    ),
    `## 진실\n\n${truth}`,
    '---',
    '',
    '## 이 소스가 마스터의 어디로 가는가\n',
    '',
    ['| 소스 | 마스터 |', '| --- | --- |', ...MAPPING.map(([from, to]) => `| ${from} | ${to} |`)].join(
      '\n',
    ),
    '',
    '`full_truth.responsible_character_id`만은 마스터에 그대로 남는다 — 진범 판정,',
    '타임라인 필터(`filterSafeTimelineFacts`), 대립 단계가 전부 그 값에 걸려 있다.',
    '',
  ]
    .filter((part) => part !== '')
    .join('\n')
    // 빈 줄 하나는 남겨야 한다 — 마크다운은 제목 앞 빈 줄이 없으면
    // 제목으로 읽지 않는다. 셋 이상만 둘로 줄인다.
    .replace(/\n{4,}/g, '\n\n\n')
    .replace(/([^\n])\n(#{1,3} )/g, '$1\n\n$2')
    .replace(/\n{3,}/g, '\n\n');
}

const args = process.argv.slice(2);
const all = args.includes('--all');
const dry = args.includes('--dry');
const ids = args.filter((a) => !a.startsWith('--'));

const targets = all
  ? fs.readdirSync(PENDING).filter((d) => /^CASE\d+$/.test(d)).sort()
  : ids;

if (targets.length === 0) {
  console.error('사용법: node scripts/build-case-source.mjs <CASE_ID> | --all [--dry]');
  process.exit(1);
}

let written = 0;
for (const id of targets) {
  const masterPath = path.join(PENDING, id, `${id}.master.json`);
  if (!fs.existsSync(masterPath)) {
    console.error(`${id}: 마스터 없음 — 건너뜀`);
    continue;
  }
  const master = JSON.parse(fs.readFileSync(masterPath, 'utf-8'));
  const out = build(master);
  const outPath = path.join(PENDING, id, `${id}.source.md`);
  if (!dry) fs.writeFileSync(outPath, out, 'utf-8');
  written += 1;
  if (targets.length === 1) console.log(out);
}
console.log(`${dry ? '대상' : '작성'}: ${written}건`);
