# 검사기를 보는 세션에게 — 지금 코퍼스에서 빨간 것은 세 번호뿐이고, 그걸 보는 사람이 없다

보낸 곳: `claude/wizardly-hamilton-x24ucp` (소설 루틴, CASE354 회차, 2026-09-27)

## 한 것

`docs/novels/CASE354.md`를 썼다(「온에어 15분 전」). 마스터는 한 글자도 안 고쳤다. 회차 기록은
`docs/novels/rounds.md`의 CASE354 회차 절이고, 데이터로 내릴 것은 그 편의
「오프라인으로 옮길 것」에 있다.

## 1. `PAIR_TWIN` 사슬 셋 — 새 검사가 아니라 이미 걸려 있는 error다

`npm run check:case CASE354`가 **errors 1**이고 내용이 「CASE355와 두 편이 판박이다」다.
이어서 CASE355를 돌리면 **CASE355는 또 CASE356과 판박이**다.

**코퍼스 전수로 쟀다.** `validate_master`를 한 번 컴파일해 마스터 **367건**에 돌렸고,

- **error는 전부 2건이고 둘 다 이 사슬이다** — 354→355(단계 사슬 골격 / 엔딩 산문 / 은폐 방식) ·
  355→356(단계 사슬 골격 / 은폐 방식 / 은폐 대상).
- **다른 코드의 error는 0이다.**

`PAIR_TWIN`은 등록 무관 error인데 셋 다 registry에 있고, `pr-checks.yml`은 **바뀐 마스터만**
`check:case`에 넣는다. 그래서 **그 셋을 건드리는 PR이 없는 한 이 빨간 것은 영원히 안 보인다.**
CLAUDE.md는 「판박이는 고쳐 쓰지 않고 뒷번호를 지운다」이므로 판단 대상은 **355·356**이고
354는 앞번호라 그대로 남는다. 소설 루틴은 마스터를 다시 쓰지 않으므로 여기서 고치지 않았다.

**급한 이유가 하나 더 있다.** 소설 루틴의 **다음 회차가 CASE355 차례**다. 지워질 수 있는 번호의
소설을 먼저 쓰면 **존재하지 않는 원문을 인용한 편**이 된다(`docs/novels/README.md`의 `-ver2`
판단과 같은 자리). 다음 회차는 이 판단이 내려졌는지 먼저 보고, 안 내려졌으면 번호를 건너뛰는
쪽으로 적어 뒀다.

**전수 재는 법.** `check:case`가 비싸 보이는 것은 매번 tsc를 다시 돌리기 때문이다.

```bash
OUT=$(mktemp -d)
npx tsc scripts/validate_master.ts --outDir $OUT --module esnext --target es2022 \
  --moduleResolution bundler --esModuleInterop --skipLibCheck
# 컴파일된 .js 의 상대 import 에 .js 를 붙인 뒤
for f in data/pending-cases/CASE*/CASE*.master.json; do node $OUT/scripts/validate_master.js "$f"; done
```

한 건에 0.4초라 **전수가 3분이 안 된다.**

## 2. 이미 있던 두 줄에 사례·값을 덧붙였다 (백로그에서 직접 고쳤다)

- **오답 후보에 `refutation`은 있는데 `refuted_by`가 없는 것** — 그 줄에 이미 CASE354 `H03`이
  이름으로 적혀 있었다. 편을 쓰다 같은 자리에 걸려 엔진 코드로 다시 확인했고
  (`offline-hypothesis.ts` 398~407행: `candidate.refutedBy === respondentId`가 아니면 빈 `deny`),
  **붙일 값을 제안해 둔다 — `CH03`(오단비).** 문장이 전해 들은 말투이고, 그 사건은 **오답 여섯 중
  셋을 기술감독 혼자 반박하는데**(`M03`·`times.T03`·`methods.H02`) 오단비는 보드에서 아무 역할이
  없다. 그래서 그 줄에 셈 하나를 더 붙였다 — **「오답 N개 중 같은 인물이 절반 이상을 반박하는가」**
  (CASE342 회차도 같은 자리를 적어 뒀다).
- **`points_finger`로만 지목되는 사람에게 보드 후보도 카드도 없는 것** — CASE353이 올린 줄의
  **두 번째 사례가 바로 다음 번호에서 나왔다.** CASE354의 오단비가 그 줄의 세는 법
  (지목 2회 이상 · `points_at` 0회 · `motives`에 후보 없음)을 **그대로 만족한다.** 진범을 가리키는
  지목은 `E03`에 잠긴 하나뿐이라, **1막에서 말만 따라가면 진범에 닿지 않는다.**

## 3. 세 번째 후보 — `mismatch`가 부르는 사실을 대조하는 검사

CASE353의 `E08.mismatch`가 **타임라인과 5분 어긋난** 첫 사례였고, CASE354의 `E04.mismatch`는
**타임라인과 방향이 반대다** — 「다시 나온 태그가 없어 계속 안에 있었어야 앞뒤가 맞는다」인데
`T14`는 범인이 나왔다고 적는다. 두 편이 연달아 같은 필드에서 났다. **`mismatch`가 부르는 사실을
`content`·`actual_timeline`과 대조하는 셈**이 후보다(오탐이 많을 자리라 전수부터).

## 4. 곁가지 — `check:case`가 `node_modules` 없이 죽는 것이 세 회차째다

`npx tsc`가 **TypeScript 6.0.2**를 받아 `TS5112`로 죽는다(package.json은 5.9.3 고정).
CASE352·353 회차가 같은 데 걸렸고 백로그 「아무나」 절에도 있다. `scripts/check-case.mjs`가
`node_modules/typescript/bin/tsc`를 직접 부르거나 `--ignoreConfig`를 붙이는 쪽이 낫다 —
세 회차가 같은 데 걸렸으므로 다음에도 걸린다.
