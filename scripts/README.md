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

## What gets enforced

`scripts/lib/master-parser.mjs`'s `validateMasterText` blocks on:

- required sections/fields present (case_id, title, opening scene,
  locations/npcs/cards with the fields `app/game.ts` needs)
- **3+ `CONTRADICTION_STAGES`**, each requiring a distinct
  `requires_presented_evidence_ids` combination
- **1+ `RED_HERRINGS`**, each with a non-empty `how_to_clear`
- **NPC name consistency**: every "CH04 &lt;name&gt;"-style mention in
  `FULL_TRUTH`/`CASE_COMPLETE` must match the `name:` field registered
  for that id in `CHARACTERS` — a mismatch here is what let a phantom
  NPC (a stale name from an earlier draft) speak mid-interview in
  production, since `app/game.ts` reads the name straight off the public
  npc list
- **Atomic `ACTUAL_TIMELINE` entries**: an entry whose `actual_action` or
  `world_fact` names two or more of its own listed `actors` is really two
  people's actions narrated as one sentence and should be split into
  separate `T0x` entries instead

and warns (non-blocking, logged to the failed-attempt file, not stdout)
on suspiciously short `release_condition`s that might unlock too easily.

The generation prompt additionally asks the model for the qualitative
directives that can't be checked by regex — hidden facts needing 2+
indirect steps to surface, red herrings leaving a subplot open — and a
second self-QA call (`buildQaInstructions` in `generate-case.mjs`)
reviews the draft against that same checklist before accepting it,
retrying (up to `--max-attempts`, default 3) when it fails.

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
references).

## Testing the parser without spending API calls

```bash
node scripts/lib/master-parser.test.mjs
```

Runs `validateMasterText`/`buildUploadEnvelope` against the real
`reference/CASE901.txt` and a couple of deliberately broken variants.

## Known gap

`generate-case.mjs` was implemented and its downstream pieces (the
parser and `ingest-case.mjs`) were verified end-to-end against the real
dev server using `reference/CASE901.txt` as a stand-in. The OpenAI call
in `generate-case.mjs` itself has not been run for real — this sandbox
has no `OPENAI_API_KEY`. Run it once locally to confirm the model
actually follows the format/pacing instructions before relying on it.
