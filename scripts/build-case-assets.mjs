// scripts/build-case-assets.ts를 node로 돌리기 위한 껍데기.
//
// 그 파일은 app/의 확장자 없는 상대 import를 쓰므로 node ESM이 그대로는
// 못 푼다. check-case.mjs와 같은 방식 — tsc로 임시 디렉터리에 옮긴 뒤
// import에 .js를 붙여 실행한다.
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const out = mkdtempSync(join(tmpdir(), 'case-assets-'));
execFileSync(
  'npx',
  [
    'tsc',
    'scripts/build-case-assets.ts',
    '--outDir',
    out,
    '--module',
    'esnext',
    '--target',
    'es2022',
    '--moduleResolution',
    'bundler',
    '--esModuleInterop',
    '--resolveJsonModule',
    '--skipLibCheck',
  ],
  { stdio: 'inherit' },
);

const addJsExtensions = (dir) => {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) addJsExtensions(path);
    else if (entry.name.endsWith('.js')) {
      writeFileSync(
        path,
        readFileSync(path, 'utf8').replace(
          /from '(\.\.?\/[^']+)'/g,
          (whole, target) =>
            target.endsWith('.js') || target.endsWith('.json')
              ? whole
              : `from '${target}.js'`,
        ),
      );
    }
  }
};
addJsExtensions(out);

execFileSync('node', [join(out, 'scripts/build-case-assets.js')], {
  stdio: 'inherit',
});
