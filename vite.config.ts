import { sites } from '@openai/sites-vite-plugin';
import tailwindcss from '@tailwindcss/postcss';
import vinext from 'vinext';
import { defineConfig } from 'vite';
import hostingConfig from './.openai/hosting.json';

// The Cloudflare D1 database backing this Worker (dashboard: Workers &
// Pages > D1 > detective-db). Not a secret — it's just an account-scoped
// resource identifier, not a credential — so it's fine to commit directly
// rather than route through a Cloudflare Workers Build variable.
// Deliberately NOT read from process.env: a later deploy failed with D1
// binding 'DB' resolving to the Cloudflare template's dummy placeholder
// id (00000000-0000-4000-8000-000000000000), meaning some build-time
// environment source (a platform-injected default, not one we set) can
// and does populate a variable named D1_DATABASE_ID with that placeholder
// — the opposite of the earlier finding that these variables never reach
// process.env at all. Hardcoded unconditionally so no environment source
// can ever override it again.
const D1_DATABASE_ID = 'f403428d-0028-4c15-b662-d4bf77b09885';

const { d1, r2 } = hostingConfig;

// macOS Seatbelt blocks FSEvents, so Codex previews need polling for HMR.
const isCodexSeatbeltSandbox = process.env.CODEX_SANDBOX === 'seatbelt';

const localBindingConfig = {
  main: 'vinext/server/fetch-handler',
  compatibility_flags: ['nodejs_compat'],
  // 사건 데이터(public/cases/*.json → dist/client/cases/*.json)는 정적
  // 에셋으로 배포된다. Worker 번들에서 9.75 MiB를 빼내기 위한 것이고,
  // 서버가 그걸 읽으려면 바인딩 이름이 필요하다.
  //
  // run_worker_first는 /cases/*를 Worker로 먼저 보내서 바깥에서 주소를
  // 찍어도 404가 되게 한다. 다만 wrangler dev에서는 이 라우팅이 적용되지
  // 않는 것을 확인했다(run_worker_first에 /favicon.svg를 넣어 봐도 여전히
  // Asset Worker가 내줬다). 그래서 이건 배포 환경에서의 두 번째 방어선으로
  // 두고, 실제 방어선은 파일 이름 쪽이다 — scripts/build-case-assets.ts가
  // 사건 내용의 해시로 이름을 짓고, 그 대응표는 Worker 번들 안에만 있다.
  // env.ASSETS.fetch()는 이 라우팅을 거치지 않으므로 서버 안에서는 그대로
  // 읽힌다.
  assets: {
    binding: 'ASSETS',
    run_worker_first: ['/cases/*'],
  },
  d1_databases: d1
    ? [
        {
          binding: d1,
          // Must match the real D1 database's name in the Cloudflare
          // dashboard (Workers & Pages > D1) — Cloudflare resolves the
          // binding by database_id, but a stale name here is still worth
          // fixing since other tooling (wrangler d1 execute, the
          // dashboard's binding list) shows/matches by name too.
          database_name: 'detective-db',
          database_id: D1_DATABASE_ID,
        },
      ]
    : [],
  r2_buckets: r2
    ? [
        {
          binding: r2,
          bucket_name: 'site-creator-r2',
        },
      ]
    : [],
};

export default defineConfig(async () => {
  // Keep Wrangler and Miniflare state project-local. These are non-secret tool
  // settings; application environment belongs in ignored `.env*` files.
  process.env.WRANGLER_WRITE_LOGS ??= 'false';
  process.env.WRANGLER_LOG_PATH ??= '.wrangler/logs';
  process.env.MINIFLARE_REGISTRY_PATH ??= '.wrangler/registry';

  // Wrangler snapshots its log path while the Cloudflare plugin is imported.
  const { cloudflare } = await import('@cloudflare/vite-plugin');

  return {
    css: { postcss: { plugins: [tailwindcss()] } },
    server: isCodexSeatbeltSandbox
      ? { watch: { useFsEvents: false, usePolling: true } }
      : undefined,
    plugins: [
      vinext(),
      sites(),
      cloudflare({
        viteEnvironment: { name: 'rsc', childEnvironments: ['ssr'] },
        config: localBindingConfig,
      }),
    ],
  };
});
