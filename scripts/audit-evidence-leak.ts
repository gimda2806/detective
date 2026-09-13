// Replays detectUndiscoveredEvidenceLeak's per-candidate decision
// (evidenceLeakDetected, the exact function the runtime calls) over every
// authored case in data/pending-cases, and reports the two ways it goes wrong.
//
// Why this exists: this one detector caused more lost turns in real play than
// anything else in the runtime, and each false positive was being found one
// playtest log at a time — fix, deploy, play, find the next one. Every
// failure has the same shape (the model is told to delete content it was
// right to state, cannot comply, and the turn is replaced by a Master
// one-liner), so the surface is measurable without a model in the loop:
// Master already ships, for every room, the exact text a correct answer is
// made of.
//
// app/ imports are extensionless (bundler resolution), so node cannot run this
// straight from source. Compile it and its two dependencies first:
//
//   OUT=$(mktemp -d)
//   npx tsc scripts/audit-evidence-leak.ts --outDir "$OUT" \
//     --module esnext --target es2022 --moduleResolution bundler \
//     --esModuleInterop --skipLibCheck
//   find "$OUT" -name '*.js' -exec perl -pi -e \
//     "s#from '(\.\.?/[^']+)'#from '\$1.js'#g unless /\.js'/" {} \;
//   node "$OUT/scripts/audit-evidence-leak.js"            # summary
//   node "$OUT/scripts/audit-evidence-leak.js" --verbose  # every finding
//
// Three probes, each a situation the game really produces:
//
//   ARRIVAL   the draft is the room's own base_description. Walking in and
//             describing the room must never look like leaking anything.
//   DISCOVERY the draft is a detail's own authored result, with that detail
//             recorded in acquire. Nothing else may be flagged — not the
//             sibling in the same room, not a similar record elsewhere.
//   MISS      the same draft, with acquire empty. The detail itself SHOULD be
//             flagged (that is the "you narrated it, now record it" nudge);
//             if it is not, a discovery can go permanently unrecorded.
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { evidenceLeakDetected } from '../app/gm/response-signals';

type Detail = { action: string; release_evidence_id?: string; result: string };
type Location = {
  id: string;
  name: string;
  base_description?: string;
  observation_rules?: Array<{ result: string }>;
  detail_rules?: Detail[];
};

const ROOT = join(process.cwd(), 'data/pending-cases');
const verbose = process.argv.includes('--verbose');

type Finding = { caseId: string; kind: string; detail: string };
const findings: Finding[] = [];
let arrivalProbes = 0;
let discoveryProbes = 0;
let missProbes = 0;

for (const caseId of readdirSync(ROOT).sort()) {
  const file = join(ROOT, caseId, `${caseId}.master.json`);
  if (!existsSync(file)) continue;
  const master = JSON.parse(readFileSync(file, 'utf8')) as {
    locations?: Location[];
  };
  const locations = (master.locations || []).filter(
    (location) => location.id && location.name,
  );
  if (!locations.length) continue;

  const candidatesAt = (location: Location) =>
    (location.detail_rules || []).filter(
      (detail) => detail.release_evidence_id && detail.result,
    );

  const publicText = (location: Location) => ({
    name: location.name,
    observationResults: (location.observation_rules || []).map(
      (rule) => rule.result,
    ),
    description: location.base_description || '',
  });

  const candidateFor = (
    location: Location,
    detail: Detail,
    here: Location,
    useLooseBar: boolean,
    justAcquiredResults: string[],
  ) => ({
    detailResult: detail.result,
    location: publicText(location),
    here: publicText(here),
    useLooseBar,
    justAcquiredResults,
  });

  for (const here of locations) {
    // ARRIVAL — the detective walks in; the draft is the room as Master
    // describes it. isAtThisLocation is false for the destination on a move
    // turn (state.current_location has not been updated yet).
    if (here.base_description) {
      for (const location of locations) {
        for (const detail of candidatesAt(location)) {
          arrivalProbes += 1;
          if (
            evidenceLeakDetected(
              here.base_description,
              candidateFor(location, detail, here, false, []),
            )
          ) {
            findings.push({
              caseId,
              kind: 'ARRIVAL',
              detail: `arriving at ${here.id} (${here.name}) flags ${detail.release_evidence_id} @ ${location.id}`,
            });
          }
        }
      }
    }

    for (const found of candidatesAt(here)) {
      // DISCOVERY — the player performed this detail's action and the draft
      // states its result, with the card correctly in acquire.
      for (const location of locations) {
        // The runtime skips other-room candidates entirely once a discovery
        // is being recorded here; mirror that so the audit measures the
        // shipped behaviour, not a hypothetical one.
        if (location.id !== here.id) continue;
        for (const detail of candidatesAt(location)) {
          if (detail.release_evidence_id === found.release_evidence_id)
            continue;
          discoveryProbes += 1;
          if (
            evidenceLeakDetected(
              found.result,
              candidateFor(location, detail, here, false, [found.result]),
            )
          ) {
            findings.push({
              caseId,
              kind: 'DISCOVERY',
              detail: `revealing ${found.release_evidence_id} @ ${here.id} flags ${detail.release_evidence_id} @ ${location.id}`,
            });
          }
        }
      }

      // MISS — same draft, nothing recorded. The detail itself must be
      // flagged so the model gets nudged to add the acquire.
      missProbes += 1;
      if (
        !evidenceLeakDetected(
          found.result,
          candidateFor(here, found, here, true, []),
        )
      ) {
        findings.push({
          caseId,
          kind: 'MISS',
          detail: `${found.release_evidence_id} @ ${here.id} is not detected from its own authored result`,
        });
      }
    }
  }
}

const byKind = (kind: string) => findings.filter((f) => f.kind === kind);
const casesWith = (kind: string) =>
  new Set(byKind(kind).map((f) => f.caseId)).size;

const pct = (n: number, total: number) =>
  total ? `${((n / total) * 100).toFixed(2)}%` : '—';

console.log(`cases scanned: ${readdirSync(ROOT).length}`);
console.log(
  `ARRIVAL   false positives ${byKind('ARRIVAL').length} / ${arrivalProbes} probes (${pct(byKind('ARRIVAL').length, arrivalProbes)}), ${casesWith('ARRIVAL')} cases affected`,
);
console.log(
  `DISCOVERY false positives ${byKind('DISCOVERY').length} / ${discoveryProbes} probes (${pct(byKind('DISCOVERY').length, discoveryProbes)}), ${casesWith('DISCOVERY')} cases affected`,
);
console.log(
  `MISS      undetected      ${byKind('MISS').length} / ${missProbes} probes (${pct(byKind('MISS').length, missProbes)}), ${casesWith('MISS')} cases affected`,
);

if (verbose) {
  for (const finding of findings) {
    console.log(`  [${finding.kind}] ${finding.caseId}: ${finding.detail}`);
  }
}
