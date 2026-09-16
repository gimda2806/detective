// oxlint 에러 수를 기준선과 비교한다. 늘어나면 실패, 줄어들면 알린다.
//
//   node scripts/lint-baseline.mjs          비교
//   node scripts/lint-baseline.mjs --write  지금 수치를 기준선으로 저장
//
// 사람이 읽는 출력을 세지 않고 --format=json을 쓰는 이유: oxlint는 CI에서
// GitHub 리포터로 자동 전환하면서 "Found 0 warnings and 49 errors." 요약
// 줄을 덧붙인다. `grep -c error`로 세면 로컬 49, CI 50이 나와서 기준선
// 검사가 항상 실패했다(실제로 첫 실행이 그래서 빨갰다). JSON은 리포터
// 전환과 무관하게 같은 값을 준다.
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';

const BASELINE = '.github/oxlint-baseline.txt';

let raw;
try {
  raw = execFileSync('npx', ['oxlint', '--format=json'], {
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  });
} catch (error) {
  // 에러가 하나라도 있으면 oxlint는 종료 코드 1로 끝난다. 그건 정상이고,
  // 우리가 볼 것은 stdout이다.
  raw = error.stdout;
  if (!raw) {
    console.error('oxlint를 돌리지 못했다.');
    console.error(error.stderr || error.message);
    process.exit(2);
  }
}

const count = JSON.parse(raw).diagnostics.filter(
  (item) => item.severity === 'error',
).length;

if (process.argv.includes('--write')) {
  writeFileSync(BASELINE, `${count}\n`);
  console.log(`기준선을 ${count}로 저장했다 (${BASELINE}).`);
  process.exit(0);
}

const baseline = Number(readFileSync(BASELINE, 'utf8').trim());
console.log(`oxlint 에러 ${count}건 (기준선 ${baseline})`);

if (count > baseline) {
  console.log(`::error::oxlint 에러가 ${baseline} → ${count}로 늘었다.`);
  try {
    execFileSync('npx', ['oxlint'], { stdio: 'inherit' });
  } catch {
    // 목록을 보여주려고 부른 것이라 종료 코드는 무시한다.
  }
  process.exit(1);
}

if (count < baseline) {
  console.log(
    `::notice::에러가 ${count}로 줄었다 — npm run lint:baseline -- --write 로 기준선도 낮춰 두면 좋다.`,
  );
}
