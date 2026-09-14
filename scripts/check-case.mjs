// 새 사건 하나를 커밋 전에 검사한다. 세 검사를 한 번에 돌린다:
//
//   1. validate_master.ts   — 스키마가 못 잡는 교차참조·개수·중복 골격
//   2. audit-converter-coverage.ts — 마스터에 적힌 값이 실제로 raw_text까지
//      도달하는지. pressure_responses/comic_tell/voice_profile/knows[].source가
//      전부 여기서 조용히 사라진 채로 배포됐었다
//   3. audit-evidence-leak.ts — 런타임 유출 검사기(evidenceLeakDetected)를
//      그대로 불러 도착/발견/미탐 세 상황을 재현
//
//   node scripts/check-case.mjs CASE283
//
// 오류가 하나라도 있으면 종료 코드 1. 생성 루틴이 그 코드로 판단하면 된다.
//
// 이 파일이 있는 이유: 두 스크립트 다 app/의 확장자 없는 import를 쓰기
// 때문에 node로 바로 못 돌린다. tsc로 옮긴 뒤 import에 .js를 붙이는
// 절차가 각 파일 상단 주석에만 적혀 있었는데, 그건 매번 찾아 읽어야 하는
// 부족 지식이다. 루틴이 외울 명령은 하나면 된다.
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readdirSync, readFileSync, writeFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const caseId = process.argv[2];
if (!caseId || !/^CASE\d+$/.test(caseId)) {
  console.error('usage: node scripts/check-case.mjs CASE283');
  process.exit(2);
}

const master = `data/pending-cases/${caseId}/${caseId}.master.json`;
try {
  statSync(master);
} catch {
  console.error(`no such master: ${master}`);
  process.exit(2);
}

const out = mkdtempSync(join(tmpdir(), 'case-check-'));
execFileSync(
  'npx',
  [
    'tsc',
    'scripts/validate_master.ts',
    'scripts/audit-converter-coverage.ts',
    'scripts/audit-evidence-leak.ts',
    '--outDir',
    out,
    '--module',
    'esnext',
    '--target',
    'es2022',
    '--moduleResolution',
    'bundler',
    '--esModuleInterop',
    '--skipLibCheck',
  ],
  { stdio: 'inherit' },
);

// tsc는 확장자 없는 상대 import를 그대로 남긴다. node ESM은 그걸 못 푼다.
const addJsExtensions = (dir) => {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) addJsExtensions(path);
    else if (entry.name.endsWith('.js')) {
      writeFileSync(
        path,
        readFileSync(path, 'utf8').replace(
          /from '(\.\.?\/[^']+)'/g,
          (whole, target) => (target.endsWith('.js') ? whole : `from '${target}.js'`),
        ),
      );
    }
  }
};
addJsExtensions(out);

let failed = false;
const run = (label, script, args) => {
  console.log(`\n──── ${label} ────`);
  try {
    execFileSync('node', [join(out, script), ...args], { stdio: 'inherit' });
  } catch {
    failed = true;
  }
};

run('validate_master', 'scripts/validate_master.js', [master]);
run('converter coverage', 'scripts/audit-converter-coverage.js', [master]);
run('evidence-leak audit', 'scripts/audit-evidence-leak.js', [caseId]);

if (failed) {
  console.log(`\n${caseId}: 실패 — 위 오류를 고친 뒤 다시 돌릴 것.`);
  process.exit(1);
}
console.log(`\n${caseId}: 세 검사 모두 통과.`);
