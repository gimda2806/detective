// 관찰 사실을 증거 카드로 *옮긴다* — 레드헤링을 카드 제시로 풀리게 하려고.
//
//   node --experimental-strip-types scripts/promote-observation-to-card.mjs            드라이런(스크래치에 쓰고 검사)
//   node --experimental-strip-types scripts/promote-observation-to-card.mjs --apply    data/ 에 실제로 쓴다
//   ... CASE005 CASE009                                                                 특정 사건만
//
// 대상: how_to_clear 가 주인공 본인 것이 아닌 증거 카드는 하나도 안 부르고 장소 관찰
// 사실(F-L##-OBS-##)만 부르는 레드헤링. 그 관찰을 observation_rules 에서 **빼서**
// detail_rules + evidence 로 옮기고, how_to_clear 와 hidden_until 의 id 를 새 E## 로
// 갈아 끼운다.
//
// 복사가 아니라 이동인 이유: 유출 검사기(audit-evidence-leak)는 observation_rules.result
// 를 도착 서술과 같은 공개 문장으로 본다. 같은 문장이 카드에도 있으면 방에 들어서는
// 순간 카드가 샌 것으로 잡힌다.
//
// 바뀌는 것 둘, 알고 쓸 것:
//   - hidden_until 의 release_prerequisite 가 F-L-OBS 였던 자리(115개)가 E## 가 된다.
//     엔진(conditionMet)은 E## 를 「그 사람에게 제시했는가」로 읽으므로, 잠금이
//     「방을 봤을 때」에서 「카드를 그 사람에게 내밀었을 때」로 옮겨 간다.
//   - 카드 이름은 「<장소>에서 본 것」이라는 임시 이름이다. 제시 보기 문구에 그대로
//     뜨므로 사람이 지어야 한다. 목록은 _names-to-review.txt 로 떨군다.
//
// 2026-09 드라이런: 대상 72건 중 71건이 check:case 세 검사 통과. CASE101 은 새 카드
// 문장이 같은 방 E02 와 명사를 공유해 DISCOVERY 오탐이 생긴다 — 문장을 갈라 써야 한다.
import { readFileSync, readdirSync, writeFileSync, mkdirSync } from 'node:fs';
import { register } from 'node:module';
register('./offline-ts-resolver.mjs', import.meta.url);
const ROOT = process.cwd();
const apply = process.argv.includes('--apply');
const only = new Set(process.argv.slice(2).filter((a) => /^CASE\d+$/.test(a)));
const OUT = apply ? null : `${ROOT}/.dryrun-observation-to-card`;
if (OUT) mkdirSync(OUT, { recursive: true });
const { validateMaster } = await import(`${ROOT}/scripts/validate_master.ts`);
const { convertStructuredMaster } = await import(`${ROOT}/app/gm/structured-master-converter.ts`);
const IDRE = /\b(?:E\d+|F-[A-Z0-9-]+|S-[A-Z0-9-]+|C\d+)\b/g;
const names = []; let cases = 0, moved = 0, broke = 0;
for (const dir of readdirSync(`${ROOT}/data/pending-cases`).sort()) {
  if (only.size && !only.has(dir)) continue;
  const path = `${ROOT}/data/pending-cases/${dir}/${dir}.master.json`;
  let m; try { m = JSON.parse(readFileSync(path, 'utf8')); } catch { continue; }
  if (!convertStructuredMaster(m)) continue;
  const chars = m.characters || []; const evs = m.evidence || [];
  const obsAt = new Map();
  for (const l of m.locations || []) for (const o of l.observation_rules || []) if (o.release_fact_id) obsAt.set(o.release_fact_id, { loc: l, rule: o });
  const moves = new Set();
  for (const h of m.red_herrings || []) {
    const ids = [...new Set((h.how_to_clear || '').match(IDRE) || [])]; if (!ids.length) continue;
    const owner = chars.find((c) => (h.surface_suspicion || '').includes(c.name)); if (!owner) continue;
    const isOwnCard = (id) => { const c = evs.find((e) => e.id === id); return c && (c.discovery_condition || '').startsWith(`${owner.name}에게`); };
    if (ids.some((id) => evs.some((e) => e.id === id) && !isOwnCard(id))) continue;
    for (const id of ids) if (obsAt.has(id)) moves.add(id);
  }
  if (!moves.size) continue;
  cases += 1;
  const before = validateMaster(m, true).filter((i) => i.severity === 'error').map((i) => i.code);
  const out = JSON.parse(JSON.stringify(m));
  let next = Math.max(0, ...(out.evidence || []).map((e) => Number((e.id.match(/\d+/) || [0])[0]))) + 1;
  for (const fid of moves) {
    const { loc, rule } = obsAt.get(fid);
    const eid = `E${String(next++).padStart(2, '0')}`;
    const l = out.locations.find((x) => x.id === loc.id);
    l.observation_rules = (l.observation_rules || []).filter((o) => o.release_fact_id !== fid);
    l.detail_rules = [...(l.detail_rules || []), { action: rule.action, requires: '없음', release_evidence_id: eid, result: rule.result }];
    const name = `${loc.name}에서 본 것`;
    names.push(`${dir} ${eid} @ ${loc.id} 「${rule.action}」 → 임시명 "${name}"`);
    out.evidence.push({ id: eid, name, source_type: 'location', found_at: loc.id, discovery_condition: rule.action, related_timeline: [], content: rule.result, proves: [], does_not_prove: [], presentation_effect: [] });
    for (const h of out.red_herrings || []) h.how_to_clear = (h.how_to_clear || '').split(fid).join(eid);
    for (const c of out.characters || []) for (const g of c.hidden_until || []) for (const k of ['release_prerequisite', 'release_trigger', 'fact_or_claim_id']) if (g[k] === fid) g[k] = eid;
    moved += 1;
  }
  const after = validateMaster(out, true).filter((i) => i.severity === 'error').map((i) => i.code);
  const added = after.filter((c) => !before.includes(c));
  if (added.length || !convertStructuredMaster(out)) { broke += 1; console.log(`  ✗ ${dir}: ${added.join(', ') || '변환 실패'}`); continue; }
  writeFileSync(apply ? path : `${OUT}/${dir}.master.json`, JSON.stringify(out, null, 2) + '\n');
}
if (OUT) writeFileSync(`${OUT}/_names-to-review.txt`, names.join('\n') + '\n');
console.log(`${apply ? '적용' : '드라이런'}: 사건 ${cases}건 · 관찰 ${moved}개 이동 · 검사기 새 error ${broke}건`);
console.log(apply ? '이제 각 사건에 npm run check:case 를 돌릴 것 — 유출 검사는 여기서 안 돈다.' : `결과 → ${OUT}/  (임시 이름 목록 _names-to-review.txt)`);
