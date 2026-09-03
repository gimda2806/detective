#!/usr/bin/env node
// Uploads a generated master into the running app by driving the existing
// "Master Upload" UI headlessly (the same form a human would use) — this
// way no code changes are needed to app/game.ts's upload path, and no
// human has to open the file to click through the upload themselves.
//
// Usage:
//   node scripts/ingest-case.mjs --file generated-cases/CASE905.upload.json [--base-url http://127.0.0.1:3000]
//
// Requires the dev server (`pnpm run dev`) already running, and the
// `playwright` package installed (`npx playwright install chromium` once).

import { chromium } from 'playwright';
import { resolve } from 'node:path';

function parseArgs(argv) {
  const args = { baseUrl: 'http://127.0.0.1:3000' };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--file') args.file = argv[++i];
    else if (arg === '--base-url') args.baseUrl = argv[++i];
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.file) {
    console.error('[fail] --file <생성된 master.txt 또는 upload.json 경로>가 필요합니다.');
    process.exit(1);
  }
  const filePath = resolve(args.file);

  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    await page.goto(args.baseUrl, { waitUntil: 'networkidle', timeout: 30000 });
    await page.setInputFiles('input[type="file"]', filePath);

    const status = page.locator('.upload-status');
    await status.waitFor({ timeout: 20000 });
    const isSuccess = await status.evaluate((el) => el.classList.contains('success'));
    const text = (await status.textContent())?.trim();

    if (isSuccess) {
      console.log(`[ok] 업로드 성공: ${text}`);
    } else {
      console.error(`[fail] 업로드 실패: ${text}`);
      process.exit(1);
    }
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(`[fail] ${error.message}`);
  process.exit(1);
});
