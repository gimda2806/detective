# Case generation pipeline

Generates new CASE9xx mysteries from a one-line seed, without the person
running it ever seeing the plot: only pass/fail status and structural
error messages reach the terminal.

## Why this shape

`app/game.ts`'s TXT master parser (`parseTxtMaster`) requires `[/SECTION]`
closing tags and doesn't understand the richer per-character
`hidden_until`/`release_condition` or `CONTRADICTION_STAGES` structure —
so masters written in that style (see `reference/CASE901.txt`) can't go
through it. Its JSON upload path (`validateUploadedCase`) barely
validates `master` at all — it just needs to be an object — so this
pipeline generates the full master text, keeps it verbatim in
`master.raw_text` (the GM prompt gets 100% of it either way), and only
lifts `locations`/`npcs`/`cards` out for the UI and `available_codes`.
`scripts/lib/master-parser.mjs` is a standalone reimplementation of that
extraction for the CASE901-style format (kept independent from
`app/game.ts` because that file does a top-level `import { env } from
'cloudflare:workers'`, which doesn't resolve under plain Node).

## Usage

```bash
# one-time
npx playwright install chromium

# 1. generate + validate + self-QA a new case (never prints plot content)
# --seed only needs genre/setting/motive — leave the trick unspecified
# and the model designs one itself.
node --env-file=.env.local scripts/generate-case.mjs \
  --seed "폐쇄된 스키 리조트, 사망 원인"
# -> [ok] CASE905 생성 및 자체 QA 통과 (시도 1/3)
#    writes generated-cases/CASE905.master.txt and CASE905.upload.json

# 2. upload it into the running dev server (pnpm run dev) without opening the file
node scripts/ingest-case.mjs --file generated-cases/CASE905.upload.json
# -> [ok] 업로드 성공: CASE905 마스터를 저장했습니다.

# 2b. or upload straight into the deployed production Worker (needs the admin token)
ADMIN_TOKEN=... node scripts/ingest-case.mjs --file generated-cases/CASE905.upload.json --prod
# equivalent to: ADMIN_TOKEN=... pnpm run ingest-case:prod -- --file generated-cases/CASE905.upload.json
```

`--prod` targets the production Worker (see `PRODUCTION_URL` in
`ingest-case.mjs`). Both Master Upload and the in-app case generator are
gated behind an admin token (`ADMIN_TOKEN` Worker secret, checked in
`app/actions.ts`) — pass it via `--token` or the `ADMIN_TOKEN` env var, or
the upload is rejected. Without `ADMIN_TOKEN` configured on the Worker,
these stay open to anyone with the URL.

Both scripts only ever print status lines and structural error messages
(missing sections, too few contradiction stages, etc.) — never scene
text, character names, or the solution. `generated-cases/` is gitignored
for the same reason.

## Design philosophy: fun is the goal, consistency is just the floor

Consistency is a pass condition, not the point. Chasing every possible
inconsistency burns retries (and money) on things a player would never
notice — nobody feels a 2-minute gap in the opening scene's timing — while
never actually checking whether the mystery is fun to play. So the code
only blocks what would genuinely break the game or has caused a real
production bug; everything else is either a non-blocking warning or a
question for the LLM's fun-focused self-QA pass; the real test is a human
playtester hitting an "아!" moment when the truth is revealed.

`scripts/lib/master-parser.mjs`'s `validateMasterText` **blocks** (errors)
only on things that mirror `app/game.ts`'s actual hard requirements
(`validateUploadedCase`) or a bug that has really happened in production:

- required sections/fields present (case_id, title, opening scene,
  locations/npcs with the fields `app/game.ts` needs, and — only if a
  card block exists at all — each card needing a title/discovery
  condition)
- `FULL_TRUTH`/`FINAL_DEDUCTION` sections present (without an answer key
  the case has no solution at all, not just a rough one)
- **NPC name consistency**: every "CH04 &lt;name&gt;"-style mention in
  `FULL_TRUTH`/`CASE_COMPLETE` must match the `name:` field registered
  for that id in `CHARACTERS` — a mismatch here is what let a phantom
  NPC (a stale name from an earlier draft) speak mid-interview in
  production, since `app/game.ts` reads the name straight off the public
  npc list

Everything that used to be a hard rejection but doesn't fit that bar is
now a **warning**: fewer than 3 `CONTRADICTION_STAGES`, reused evidence
combinations across stages, missing/empty `RED_HERRINGS`, merged
multi-actor `ACTUAL_TIMELINE` entries, and both `hidden_until`
`release_prerequisite`/`release_trigger` schema checks. Warnings never
trigger a retry — they're just printed alongside a successful run for a
human to skim.

The generation prompt (`buildGenerationInstructions` in
`generate-case.mjs`) also asks the model to design in a specific
**order**: trick first (you can't know what to hide until you know the
trick), then the clues that make the reveal land, then a false suspect
who looks guiltier than the real culprit until the end, and only then the
timeline/characters/locations needed to scaffold those three — instead of
building the scaffolding first and hoping a trick falls out of it.

A second self-QA call (`buildQaInstructions` in `generate-case.mjs`)
reviews the structurally-valid draft against exactly **4 fun-only
questions** before accepting it (retrying, up to `--max-attempts`,
default 3, when it fails):

1. Are there at least 3 clues worth looking back on once the truth comes out?
2. Is there a false suspect who looks convincing partway through?
3. Does the real culprit look like the least suspicious person until the end?
4. Does the trick resolve using only information the player could actually obtain?

Consistency nitpicks (typos, ID drift, minor timing) are explicitly
excluded from this checklist — they're either caught by code above or not
worth a retry at all.

Both the QA reviewer and each structural error are attributed to one
top-level section (`CASE_IDENTITY`, `OPENING_SCENE`, ... or `MULTIPLE`
when a fix genuinely needs more than one). When every current issue
localizes to a proper subset of the document, the retry only asks the
model to rewrite those sections — the rest of the master is spliced
back in unchanged (`replaceTopSection` in `master-parser.mjs`) — instead
of touching the whole thing. Only attempt 1 ever drafts from the seed;
every retry after that — section-scoped or not — repairs the actual
master text the previous attempt produced, never redrafts from
scratch. Falls back to a whole-document repair pass (still based on
the existing text, not the seed) whenever any issue can't be
confidently localized to a section (including two categories that are
always left unmapped: NPC name mismatches, since either side could be
the one to rename, and merged-timeline-entry splits, since fixing one
ripples into other characters' and evidence's `related_timeline`
references). ID-reference typos (a dropped zero-pad like `E2` for `E02`)
are auto-fixed by `repairReferencedIds` without a model call at all.

## Testing the parser without spending API calls

```bash
node scripts/lib/master-parser.test.mjs
```

Runs `validateMasterText`/`buildUploadEnvelope` against the real
`reference/CASE901.txt` and a couple of deliberately broken variants.

## The in-app generator is a separate, duplicated pipeline

`app/gm/case-generation.ts` is a near-verbatim TypeScript port of this
script's prompt-building and retry logic, used by the in-app case
generator UI (`app/CaseGenerator.tsx`, gated behind the `ADMIN_TOKEN`
Worker secret via `app/actions.ts`). It only shares
`scripts/lib/master-parser.mjs` with this script (the validator,
`repairReferencedIds`, `buildUploadEnvelope`, section-splicing helpers) —
`buildGenerationInstructions`, `buildQaInstructions`, and the rest of the
prompt text are copy-pasted, not imported, because `app/gm/*.ts` runs in
the Cloudflare Worker (`import { env } from 'cloudflare:workers'`) and
can't import a plain Node script. **Any future change to the design
order, the QA checklist, or the generation instructions needs to be made
in both files or the CLI and in-app generators will silently drift
apart.**

There's also a manual `workflow_dispatch`-only GitHub Actions workflow
(`.github/workflows/generate-case.yml`) that runs this script then
`scripts/ingest-case.mjs --prod` in CI using `OPENAI_API_KEY`/
`ADMIN_TOKEN` repo secrets, for generating a case without a local
checkout. It has no cron schedule and no notification step — it only
runs when someone triggers it from the Actions tab.

## Status

`generate-case.mjs` has been run for real (not just against the
`reference/CASE901.txt` stand-in) and its downstream pieces
(`ingest-case.mjs`, the dev-server upload path) verified end-to-end.
