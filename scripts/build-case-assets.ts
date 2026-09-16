// 사건 데이터를 Worker 번들 밖으로 내보낸다.
//
// data/cases/<ID>/case.json과 data/pending-cases/<ID>/<ID>.master.json을
// 읽어 런타임이 쓰는 봉투(CaseData)로 변환·검증한 뒤 public/cases/ 아래에
// 떨군다. public/은 빌드 때 dist/client로 복사되고, 그건 Worker 스크립트가
// 아니라 정적 에셋이라 스크립트 크기 한도에 들어가지 않는다.
//
//   public/cases/<hash>.json      검증까지 끝난 봉투 하나. getCase()가 읽는다.
//   app/generated/case-index.json  목록 한 줄씩 + 그 hash 대응표.
//
// 파일 이름이 사건 내용의 해시인 이유: 에셋은 주소만 알면 누구나 받을 수
// 있다. /cases/CASE302.json이었으면 URL 한 줄로 그 사건의 진범까지 전부
// 새어 나간다. 대응표는 에셋이 아니라 Worker 번들 안에 들어간다(그래서
// app/ 아래에 쓴다) — 목록에 필요한 제목·요약·태그만 있고 본문은 없으니
// 번들 크기에는 거의 영향이 없다.
//
// 변환·검증은 app/gm/case-envelope.ts와 structured-master-converter.ts —
// 런타임이 쓰던 바로 그 함수들이다. 여기서 따로 구현하면 목록의 요약·태그와
// 실제 사건이 갈라진다.
//
//   node scripts/build-case-assets.mjs
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { convertStructuredMaster } from '../app/gm/structured-master-converter';
import { buildMasterIndex, masterFormatWarnings } from '../app/gm/master-index';
import {
  caseIndexRow,
  getStringField,
  validateUploadedCase,
  type CaseIndexRow,
} from '../app/gm/case-envelope';

const root = process.cwd();
const outDir = path.join(root, 'public', 'cases');
const indexPath = path.join(root, 'app', 'generated', 'case-index.json');

type Curated = { id: string; summary?: string; tags?: unknown };

const curatedById = new Map<string, Curated>();
const curatedPath = path.join(root, 'data', 'cases', 'index.json');
if (fs.existsSync(curatedPath)) {
  const parsed: unknown = JSON.parse(fs.readFileSync(curatedPath, 'utf8'));
  if (Array.isArray(parsed)) {
    for (const item of parsed as Curated[]) {
      if (item && typeof item.id === 'string') {
        curatedById.set(item.id.toUpperCase(), item);
      }
    }
  }
}

// 읽는 순서가 곧 index.json의 순서지만, 목록 정렬은 런타임의
// sortCaseSummaries가 진행 상태까지 보고 다시 한다. 여기서는 id로만
// 안정적으로 맞춰 둬서 빌드마다 파일이 흔들리지 않게 한다.
const sources: Array<{ file: string; structured: boolean }> = [];

const bundledDir = path.join(root, 'data', 'cases');
for (const entry of fs.readdirSync(bundledDir, { withFileTypes: true })) {
  if (!entry.isDirectory()) continue;
  const file = path.join(bundledDir, entry.name, 'case.json');
  if (fs.existsSync(file)) sources.push({ file, structured: false });
}

const pendingDir = path.join(root, 'data', 'pending-cases');
if (fs.existsSync(pendingDir)) {
  for (const entry of fs.readdirSync(pendingDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const dir = path.join(pendingDir, entry.name);
    for (const name of fs.readdirSync(dir)) {
      if (name.endsWith('.master.json')) {
        sources.push({ file: path.join(dir, name), structured: true });
      }
    }
  }
}

fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });

const index: CaseIndexRow[] = [];
const seen = new Set<string>();
let skipped = 0;
let formatWarned = 0;

for (const { file, structured } of sources) {
  const relative = path.relative(root, file);
  let raw: unknown = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (structured) {
    const converted = convertStructuredMaster(raw);
    if (!converted) {
      console.warn(
        `[cases] skipped ${relative}: does not match the structured master schema`,
      );
      skipped += 1;
      continue;
    }
    raw = converted;
  }

  const validated = validateUploadedCase(raw);
  if (!validated.caseData || validated.errors.length) {
    console.warn(`[cases] skipped ${relative}: ${validated.errors.join(' ')}`);
    skipped += 1;
    continue;
  }

  const caseId = validated.caseData.case_id;
  // 같은 번호가 data/cases와 data/pending-cases 양쪽에 있으면 구조화
  // 마스터가 이긴다 — 읽는 순서상 나중에 오는 쪽이다. 예전 런타임도
  // 같은 순서로 덮어썼다.
  if (seen.has(caseId)) {
    const at = index.findIndex((row) => row.id === caseId);
    if (at >= 0) index.splice(at, 1);
  }
  seen.add(caseId);

  const body = JSON.stringify(validated.caseData);
  const assetFile = `${crypto
    .createHash('sha256')
    .update(caseId)
    .update(body)
    .digest('hex')
    .slice(0, 32)}.json`;
  fs.writeFileSync(path.join(outDir, assetFile), body);

  // 사건을 열 때 화면에 뜨는 경고와 같은 함수다. 여기서 한 번 돌려 두면
  // 목록이 매 요청 307건의 raw_text를 다시 파싱하지 않아도 된다.
  const warnings = masterFormatWarnings(
    buildMasterIndex(getStringField(validated.caseData.master, 'raw_text')),
  );
  if (warnings.length) formatWarned += 1;

  index.push(
    caseIndexRow(
      validated.caseData,
      validated.summary || '',
      assetFile,
      warnings.length === 0,
      curatedById.get(caseId),
    ),
  );
}

index.sort((a, b) => a.id.localeCompare(b.id));
fs.mkdirSync(path.dirname(indexPath), { recursive: true });
fs.writeFileSync(indexPath, JSON.stringify(index));

const bytes = fs
  .readdirSync(outDir)
  .reduce((sum, name) => sum + fs.statSync(path.join(outDir, name)).size, 0);
console.log(
  `[cases] ${index.length}건 → public/cases (${(bytes / 1048576).toFixed(2)} MiB)` +
    (skipped ? `, ${skipped}건 건너뜀` : '') +
    `, 현재 포맷 부합 ${index.length - formatWarned}건`,
);
