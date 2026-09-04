import { sites } from '@openai/sites-vite-plugin';
import tailwindcss from '@tailwindcss/postcss';
import vinext from 'vinext';
import { defineConfig } from 'vite';
import hostingConfig from './.openai/hosting.json';

const SITE_CREATOR_PLACEHOLDER_DATABASE_ID =
  '00000000-0000-4000-8000-000000000000';

// A build variable literally named CLOUDFLARE_D1_DATABASE_ID was
// confirmed present and saved in the Cloudflare dashboard's Build
// variables, yet the deployed wrangler.json still baked in the
// placeholder ID below — Cloudflare Workers Builds appears to reserve
// (and not forward) env var names starting with CLOUDFLARE_/CF_ for its
// own internal use. D1_DATABASE_ID (no reserved prefix) avoids that.
const D1_DATABASE_ID =
  process.env.D1_DATABASE_ID ||
  process.env.CLOUDFLARE_D1_DATABASE_ID ||
  SITE_CREATOR_PLACEHOLDER_DATABASE_ID;

const { d1, r2 } = hostingConfig;

// macOS Seatbelt blocks FSEvents, so Codex previews need polling for HMR.
const isCodexSeatbeltSandbox = process.env.CODEX_SANDBOX === 'seatbelt';

const localBindingConfig = {
  main: 'vinext/server/fetch-handler',
  compatibility_flags: ['nodejs_compat'],
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
