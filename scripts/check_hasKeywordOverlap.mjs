// Self-contained assert check for hasKeywordOverlap() in
// app/gm/response-signals.ts. Can't import that file directly with plain
// `node` — it pulls in ./action-scope via an extensionless bundler-style
// specifier that only vinext's bundler resolves, not Node's own ESM loader
// (unlike scripts/validate_master.ts, which has no local imports at all).
// So this mirrors the function body instead — keep it in sync if the real
// one changes. Run: node scripts/check_hasKeywordOverlap.mjs
function hasKeywordOverlap(value, sourceContent, { minHits = 3, minRatio = 0.25 } = {}) {
  const tokenize = (text) => text.match(/[가-힣]{2,}/g) || [];
  const sourceTokens = new Set(tokenize(sourceContent));
  if (sourceTokens.size < minHits) return false;
  let hits = 0;
  for (const token of sourceTokens) {
    if (value.includes(token)) hits += 1;
  }
  return hits >= minHits && hits / sourceTokens.size >= minRatio;
}

const e01Content =
  '테스트용 앰프의 접지 회로가 우회되어 금속 섀시에 전류가 흐르도록 개조된 흔적이 발견된다.';
const paraphrasedReveal =
  '메인 보드에서 접지선이 빠져 나가 금속 섀시로 이어지지 않고, 대신 중간에 짧은 점퍼선이 끼워져 우회 연결된 부분이 보인다. 접지 패드 근처 솔더가 유난히 반짝이고, 피복을 벗긴 자국이 막 생긴 듯 깨끗하다. 점퍼선 양끝 납땜은 다른 부위보다 색이 다소 밝고, 열을 오래 준 듯 플럭스 흔적이 번져 있다. 금속 섀시의 안쪽 나사 근처에는 미세한 스파크 얼룩처럼 그을음 점점이 붙어 있다.';
const unrelated =
  '서한결이 짧게 눈을 내리깔고 말을 고른다. 도재현 씨는 일에서는 굉장히 꼼꼼했습니다.';

console.assert(
  hasKeywordOverlap(paraphrasedReveal, e01Content),
  'FAIL: heavily paraphrased reveal of the same fact should still match',
);
console.assert(
  !hasKeywordOverlap(unrelated, e01Content),
  'FAIL: unrelated dialogue must not match',
);
console.log('hasKeywordOverlap check passed');
