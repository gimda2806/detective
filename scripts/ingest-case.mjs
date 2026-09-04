#!/usr/bin/env node
// Uploads a generated master into a running app by driving the existing
// "Master Upload" UI headlessly (the same form a human would use) — this
// way no code changes are needed to app/game.ts's upload path, and no
// human has to open the file to click through the upload themselves.
//
// Usage:
//   node scripts/ingest-case.mjs --file generated-cases/CASE905.upload.json [--base-url http://127.0.0.1:3000]
//   node scripts/ingest-case.mjs --file generated-cases/CASE905.upload.json --prod
//
// --prod targets the deployed production Worker (PRODUCTION_URL below)
// instead of the local dev server. The upload form is gated by an admin
// token (see app/actions.ts's isAuthorized) — pass it via --token or the
// ADMIN_TOKEN environment variable, or the upload will be rejected.
//
// Requires the target server already running (for local: `pnpm run dev`),
// and the `playwright` package installed (`npx playwright install chromium`
// once).

import { chromium } from 'playwright';
import { resolve } from 'node:path';

const PRODUCTION_URL = 'https://detective.hyukgu86.workers.dev';

function parseArgs(argv) {
  const args = {
    baseUrl: 'http://127.0.0.1:3000',
    token: process.env.ADMIN_TOKEN || '',
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--file') args.file = argv[++i];
    else if (arg === '--base-url') args.baseUrl = argv[++i];
    else if (arg === '--prod') args.baseUrl = PRODUCTION_URL;
    else if (arg === '--token') args.token = argv[++i];
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.file) {
    console.error(
      '[fail] --file <생성된 master.txt 또는 upload.json 경로>가 필요합니다.',
    );
    process.exit(1);
  }
  const filePath = resolve(args.file);

  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    await page.goto(args.baseUrl, { waitUntil: 'networkidle', timeout: 30000 });
    // Scoped to the Master Upload section specifically — the Case
    // Generator panel has its own identically-named admin-token input.
    const uploadSection = page.locator('section[aria-label="마스터 업로드"]');
    if (args.token) {
      await uploadSection.locator('input[name="admin-token"]').fill(args.token);
    }
    await uploadSection.locator('input[type="file"]').setInputFiles(filePath);

    const status = uploadSection.locator('.upload-status');
    await status.waitFor({ timeout: 20000 });
    const isSuccess = await status.evaluate((el) =>
      el.classList.contains('success'),
    );
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
