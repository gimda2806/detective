// validate_master.ts 의 판정 코드가 전부 docs/checks.md 에 적혀 있는가.
//
//   npm run check:codes
//
// 왜 있는가: 검사기 목록 문서는 「검사를 더하면 그 줄도 고친다」는 규칙만으로는
// 낡는다(2026-09-26 사용자 결정 — 판정 코드를 만들 때마다 정리한다). 그래서
// 코드에서 코드를 뽑아 문서와 대조하고, 빠진 것이 있으면 PR 검사에서 선다.
// 반대로 문서에만 있는 코드(지운 검사)도 알린다 — 그쪽은 경고만.
import { readFileSync } from 'node:fs';

const src = readFileSync('scripts/validate_master.ts', 'utf8');
const doc = readFileSync('docs/checks.md', 'utf8');

// 두 모양 — `code: 'X'` 리터럴, 그리고 ratioIssues/concentrationIssues 같은
// 헬퍼에 첫 인자로 넘기는 `'X',` 한 줄.
const inCode = new Set([
  ...[...src.matchAll(/code:\s*'([A-Z][A-Z_]+)'/g)].map((m) => m[1]),
  ...[...src.matchAll(/^\s*'([A-Z][A-Z_]{5,})',\s*$/gm)].map((m) => m[1]),
]);
const inDoc = new Set([...doc.matchAll(/`([A-Z][A-Z_]{5,})`/g)].map((m) => m[1]));

const missing = [...inCode].filter((c) => !inDoc.has(c)).sort((a, b) => a.localeCompare(b));
const stale = [...inDoc].filter((c) => !inCode.has(c) && !/^(E|F|S|C|L|T|R|CH|M|H)[0-9-]/.test(c)).sort((a, b) => a.localeCompare(b));

console.log(`판정 코드 ${inCode.size}개 · 문서에 있는 것 ${inCode.size - missing.length}개`);
if (stale.length) {
  console.log(`문서에만 있는 코드(지웠거나 다른 스크립트의 것) ${stale.length}: ${stale.join(', ')}`);
}
if (missing.length) {
  console.error(`::error::docs/checks.md 에 없는 판정 코드 ${missing.length}개 — 그 줄을 쓸 것: ${missing.join(', ')}`);
  process.exit(1);
}
console.log('docs/checks.md 가 판정 코드를 전부 담고 있다.');
