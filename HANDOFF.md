# Detective Sites Handoff

Updated: 2026-09-02

## Current Status

This workspace is intentionally local-only. Do not deploy or push to Sites until the GM play quality has been tested in fresh sessions.

The latest committed checkpoint is `8b2c71b` (`Award evidence for confirmed custody statements`). The working tree contains important uncommitted local changes and must be kept together.

## What Has Changed

- The GM now receives an action contract so movement, observation, search, opening, examination, comparison, recovery, record review, CCTV review, gathering, and interviewing stay separate.
- Short target-only inputs such as a person, location, object, record, or CCTV label are resolved into the smallest context-safe action instead of requiring a full sentence.
- Player input remains separate from GM-written detective banter. The latter is stored as a `detective` dialogue role and rendered with a magnifying-glass avatar; Han Jiwoo scene messages use a pencil avatar.
- Scene narration is stored separately from Han Jiwoo dialogue. Only direct Jiwoo lines receive the pencil avatar; neutral narration has no character profile.
- NPC replies are constrained to the actual question. Broad route questions should remain useful, but no longer produce perfect timelines or full knowledge dumps.
- Han Jiwoo is positioned as a familiar, dry partner: scene banter and neutral spatial orientation are allowed, but she does not choose evidence, priorities, or conclusions for the detective.
- Evidence, CCTV, records, and seal comparisons are constrained to their observable proof scope. Unsupported exclusion of people, objects, methods, or routes is blocked.
- Group scenes distinguish gathering people, opening group conversation, explicit round-robin questions, and individual interviews.
- Case closing is available only through the UI button and asks for the full explanation plus play review. Text commands do not end a case.
- Master upload validation can show issues in the UI, but it never rewrites or creates Master content.
- The GM now distinguishes safe improvisation from decisive case facts. Ordinary non-decisive details may be added naturally; continuity-relevant additions are saved in `scene_established_facts`; unsupported decisive additions are discarded.

## Important Files

- `app/game.ts`: game state, OpenAI request, Master parsing, response application, and the main GM rules.
- `app/gm/action-scope.ts`: player-action parsing and response scope contracts.
- `app/gm/response-signals.ts`: draft-response violation detection.
- `app/gm/meta-prompts.ts`: meta, repair, and case-closing prompts.
- `app/DetectiveApp.tsx`: play UI and case-closing button.
- `app/MasterUpload.tsx`: Master upload validation feedback.
- `app/globals.css`: UI styles.
- `data/cases/CASE014/case.json`: revised live-scene opening example.

## Continue On Another PC

1. Extract this source ZIP.
2. Run `pnpm install` in the project folder.
3. Create a local `.env.local` with your own `OPENAI_API_KEY`. The key is intentionally not included in this ZIP.
4. Start the app with `pnpm run dev -- --host 127.0.0.1`.
5. Open `http://localhost:3000`.

Uploaded local cases and saved conversations live in the local D1 development state, not in this ZIP. Re-upload any CASE007/CASE008 Master files if those cases are needed on the new computer.

## Verification

The latest local verification passed:

- `pnpm exec oxfmt app/game.ts app/gm/response-signals.ts`
- `pnpm run build`
- `git diff --check`

## Next Work

- Test fresh sessions for CASE002, CASE007, CASE008, and CASE014 against the new action contracts.
- Inspect false positives or gaps in `app/gm/response-signals.ts` before adding more regexes.
- Continue splitting `app/game.ts` only by cohesive responsibility; do not turn Master creation or automatic Master repair into an app feature.
- Keep deployment paused until local play quality is satisfactory.
