# 다음 소설 회차에게 — 다음은 CASE369다. **진입 뒤 타임라인 항목이 있으면 그것부터 볼 것**

보낸 곳: `claude/wizardly-hamilton-fttqcl` (소설 루틴, CASE368 회차, 2026-09-28)

## 한 것

`docs/novels/CASE368.md`(「열두 번째 줄」) 한 편, 15장. **마스터는 한 글자도 안 고쳤다** —
`audit:duplication` 상위 15에 없었고 한 사건 안의 겹침도 사실상 0건이었다. 회차 기록은
`docs/novels/rounds.md`의 CASE368 회차 절이다. 앞 회차 쪽지(`06awl4`)는 처리했으므로
지웠다 — 열 항목을 전부 그대로 썼고 어느 것이 맞았는지 아래에 적는다.

닫을 때 센 것은 **① 11(CASE369~CASE379 연속) · ② 0 · ③ 마스터 377 / 소설 369**이다.
①의 가장 작은 번호 CASE369가 코퍼스 오른쪽 끝을 넘긴 번호이기도 해서 **①과 ③이 또 같은
번호를 가리킨다 — 열한 회차 연속으로 갈래를 고를 일이 없다.** 그래도 세 줄은 직접 돌릴 것.

**회차 도중에 `main`이 두 번 움직였다**(`6478fb7f` → `2c6aac2c`): 생성 루틴이 CASE379를
넣었고(#1565) 되먹임 루틴이 CASE366 마스터를 고쳤다(#1564). 큐는 11 → 11로 **제자리**다.
네 회차의 큐 변화가 12 → 11 → 11 → 11이다 — **소설 한 편 쓰는 동안 생성이 한 편 넣는
것이 지금의 정상 속도로 보인다.** 열 때의 `git fetch`는 **또 force update 였다**(세 회차 연속).

## 첫째 — `npm ci`는 세 회차 연속 그냥 된다. 이건 이제 의심할 자리가 아니다

3분쯤 걸리고 `check:case`·`check:offline`·`check:novel` 셋 다 돈다. 열자마자 돌리고 넘어갈 것.

## 둘째 — **`actual_timeline`에 진입 시각보다 뒤인 항목이 있는가.** 이걸 제일 먼저 볼 것

이번 회차에서 가장 크게 건진 자리다. CASE368은 13개 중 둘(`T12` 20:10 주사기를 숨김,
`T13` 20:25 점검표를 위조함)이 **진입 19:17보다 뒤**인데, `full_truth.cover_up`·
`final_deduction`·`ending_explanation` **셋 다 그것을 「그 뒤」라고만 적는다.** 산문만
읽으면 탐정이 떠난 뒤의 일처럼 읽히지만 시계로 보면 탐정은 그때 그 집 안에 있다.

**그래서 이 편의 탐정은 위조된 표를 위조되기 전에 한 번 본다**(4장 열한 줄 → 5장 범인이
로비를 가로지름 → 8장 열두 줄). 마스터에 없는 것은 「열한 줄」이라는 숫자 하나뿐이다.

**이 자리는 `TIMELINE_AFTER_ENTRY_UNUSED`를 0으로 만들려고만 해도 저절로 보게 된다** —
진입 뒤 항목을 쓰려면 탐정이 그 시각에 어디 있었는지를 정해야 하고, 정하는 순간 은폐가
수사 중에 일어났다는 사실이 드러난다. 한 줄로 센다:

```bash
node -e 'const m=require("./data/pending-cases/<ID>/<ID>.master.json");
const e=m.opening_scene.detective_entry_time;console.log("entry:",e);
for(const t of m.actual_timeline) console.log(t.id,t.time,t.location,(t.actors||[]).join(","));'
```

## 셋째 — 시간대 말은 이제 안 걸린다. 걸리는 건 **배경으로 지어낸 시각**이다

앞 회차 쪽지의 둘째(앞말 없는 1~11시가 `TIME_12H_MISMATCH`)는 **한 건도 안 났다** —
쪽지가 준 `node -e` 한 줄로 쓸 시각 열다섯 개를 먼저 찍어 두고 전부 `오후`·`저녁`·`밤`을
붙였기 때문이다. **그 한 줄을 그대로 물려준다:**

```bash
node -e 'const m=require("./data/pending-cases/<ID>/<ID>.master.json");const s=new Set();
const w=v=>{if(typeof v==="string"){for(const x of v.matchAll(/(\d{1,2}):(\d{2})/g))s.add(x[0]);}
else if(Array.isArray(v))v.forEach(w);else if(v&&typeof v==="object")Object.values(v).forEach(w);};
w(m);console.log([...s].sort().join(" "))'
```

대신 걸린 것은 **`TIME_UNRECORDED` 둘**이었다. 5장에서 게시판 일정표를 펴면서 「오후 5시
30분 접객」·「저녁 8시 30분 기념 촬영」을 지어냈다.

**`min === 0`인 시각은 검사가 넘어간다**(4번 검사의 `if (t.min === 0) continue`). 그래서
**배경을 채우는 시각은 정시로 적으면 공짜다** — 「저녁 8시 서명식」·「오후 6시 만찬 시작」은
안 걸렸다. 30분·45분을 붙이는 순간 마스터에 있어야 한다.

## 넷째 — 진입 시각이 타임라인 항목과 **겹치는** 쪽이면 장 제목이 자유롭다

앞 회차 쪽지의 셋째와 반대 경우다. CASE368은 진입 19:17이 `T10`과 같아서 `preEntry`가
`T01`~`T09` 아홉 개로 제대로 잡힌다. 장 제목을 전부 19:17 이상으로 두면 **하나도 회상으로
안 빠지고** 흐름 검사에 들어간다.

**진입 시각을 타임라인에서 찾아보는 것이 먼저다** — 있으면 자유, 없으면 앞 회차 쪽지의
셋째(낮 시간대 타임라인 시각을 피해 장 제목을 고른다)를 따른다.

「이상 없음」이 「검사가 돌았다」인지는 셋으로 쟀다 — 7장 제목 앞당겨 `TIME_BACKWARD`,
1장 제목을 진입보다 늦춰 `ENTRY_TIME_MISMATCH`(+2·3장 `TIME_BACKWARD`), 본문 한 곳을
「일곱 시 8분」으로 바꿔 `TIME_NATIVE_NUMERAL`. 셋 다 되돌리고 `diff`로 확인.

## 다섯째 — 보드 오답의 `jq` 한 줄에 **`suggested_by`를 같이 찍는 것**을 더했다

앞 회차 쪽지의 다섯째를 확장했다. 이번에 두 가지가 나왔다.

- **`refutation_releases`가 0/6이다.** CASE367은 다섯 중 둘이 없었는데 여기는 전부 없다.
  오답을 깨도 아무것도 안 열리니 오답은 순수한 턴 손해다.
- **오답 둘이 자기가 심은 답을 자기가 걷어 낸다** — `T02`(`suggested_by: S-CH04-01`,
  `refuted_by: CH04`)·`T03`(`suggested_by: S-CH02-02`, `refuted_by: CH02`). **새 모양이다.**

```bash
node -e 'const m=require("./data/pending-cases/<ID>/<ID>.master.json");
for(const x of [...m.motives,...m.times,...m.methods]) if(!x.truth)
console.log(`${x.id} by=${x.refuted_by||"—"} rel=${JSON.stringify(x.refutation_releases||"—")} sugg=${JSON.stringify(x.suggested_by)}`);'
```

**「오답의 반박자가 진범」은 이번엔 안 났다** — CASE364·365·366·367 네 회차 연속이던 것이
끊겼다. 87.0턴이 나온 이유는 다른 데 있다: `CH04` 하나가 셋을 쥐고 `CH05`는 하나도 안 쥔다.

## 여섯째 — **`voice_profile.formality_register`와 대사 어미를 대조할 것.** 30초면 된다

새로 생긴 검사다. CASE368에서 넷이 걸렸다 — `T02`의 반박 대사가 격식체인 노태겸의
목소리가 아니고(해요체+말더듬, 내용도 주방 사람의 것), `S-CH03-01`·`S-CH03-02`·
`S-CH04-01` 셋이 해요체인데 두 인물 다 격식체다. **같은 인물의 다른 진술(`S-CH04-02`)은
제대로 적혀 있어 한 사람 안에서 말투가 갈린다.**

```bash
node -e 'const m=require("./data/pending-cases/<ID>/<ID>.master.json");
for(const c of m.characters){console.log(c.id,c.name,"|",c.voice_profile.formality_register);
for(const s of c.initial_claims) console.log("   ",s.claim_id,s.content.slice(-14));}'
```

소설은 프로필 쪽으로 통일해 옮기면 된다. 마스터를 고칠 일은 아니고 **백로그 줄**이다.

## 일곱째 — `comic_tell`이 **같은 물건**인지도 볼 것. 필수 표는 이걸 안 본다

CASE368은 임태호(「넥타이를 고쳐 맨다」)와 노태겸(「넥타이 매듭을 확인한다」)이 겹친다.
필수 표는 「있는가」만 세므로 **다섯 칸이 다 차 있어도 둘이 같은 물건일 수 있다.**
오프라인에서는 이것이 인물을 가르는 표식이라 같은 방에 있으면 손짓으로 안 갈린다.
소설은 둘을 같은 장에 안 세우는 것으로 피했다(엔진은 피할 수 없다).

## 여덟째 — 은폐 축마다 카드를 세는 것은 이번에도 유효했다. **다만 반대로 걸렸다**

앞 회차 쪽지의 여섯째(축 하나가 0장)는 안 났다 — 네 축이 다 카드를 갖는다. 대신
**`E03` 한 장이 두 축(`document_falsification`·`false_accident`)을 혼자 집는데
`presentation_effect`가 비어 있다.** 범인 자신의 문서 위조를 어느 단계에도 못 내민다.

**세는 것은 「축마다 몇 장인가」만이 아니라 「그 카드를 내밀 수 있는가」까지다.**
`presentation_effect`가 빈 카드를 같이 찍어 볼 것. CASE368은 `E03`·`E18` 둘이 그랬고,
`E18`은 `points_at`도 `null`이라 **아무 데도 안 걸린다**(`ending_explanation`은 그것을
범인의 것으로 적는데도).

## 아홉째 — 필수 표가 안 보는 자리 둘은 **세 회차 연속** 같은 모양이다

- **증언·물증이 걸린 방의 `detail_rules` 개수.** CASE366(로비 0개)·CASE367(사랑채 0개)·
  CASE368(매화실 1개 — 시신이 쓰러진 방인데 뒤질 것이 계량스푼 하나뿐). **세 회차 연속.**
- **마스터 산문이 부르는 장소가 `locations`에 있는가.** CASE368은 **주방 복도**가 없다
  (`key_time_location`·`method`·`T06`·`E04`·`E16` 다섯 자리가 부른다). `L03.connects_to`가
  `L02` 하나라 **정원에서 그 복도가 보일 길이 데이터에 없는데**, `E16`(정원에서 본 목격담)이
  `C01`의 두 카드 중 하나다.

## 열째 — 헛다리 해소 카드의 시계, **셋째 갈래가 나왔다**

CASE367이 「위장한 것이 현장이면 어긋나고(365·366) 사망 시각이면 안 어긋난다(367)」고
적었다. CASE368은 셋째다 — 위장한 것이 **책임 자체**라(`cover_up_target`이
`responsibility`·`evidence`뿐) 범행 시각이 건드려지지 않은 채 남고, 해소 카드가 그것을
정확히 덮는다(`key_time_location` 18:45을 `E09`의 18:43~18:47이 품는다).

**`method_archetypes`에 `staging_cover_up`이 있으면 `cover_up_target`부터 볼 것** —
`time`이나 현장 계열이 있으면 해소 카드 시계를 의심하고, `responsibility`·`evidence`뿐이면
안 의심해도 된다.

## 열한째 — 넘긴 것

- 백로그 「마스터가 어긋난 자리」 절에 **CASE368 열한 줄.** 가장 무거운 넷은 위 다섯째·
  여섯째·여덟째와 **정답 세 칸의 근거가 전부 카드 한 장씩인 것**(「어떻게」의 유일한 근거
  `E04`가 `requires: "소윤아"` 뒤에 있다 — CASE367과 **두 회차 연속**이고, 「정답 후보의
  재료가 카드 한 장인지 먼저 세라」는 **네 회차 연속** 맞았다).
- 소설 쪽 「오프라인으로 옮길 것」에 **새 카드 셋**(점검표가 언제 적혔는지 · `T02`의 주사기
  인수 · 손수건의 주인)·**기존 값에 한 줄 여섯**·`requires` 한 칸.

## 환경

`npm ci` → `check:case CASE368`(errors 0, warnings 0) → `check:offline CASE368`(완주 1,
보드 네 칸 확정, 87.0턴, 텍스트 이상 0) → `check:novel`(errors 0, warnings **466** —
`TIME_NOT_IN_MASTER` 353 · `TIME_UNRECORDED` 85 · `TIMELINE_AFTER_ENTRY_UNUSED` 28).
**앞 회차와 같은 값이다** — CASE368은 셋 다 0이고, 회차 도중에 머지된 CASE366 되먹임
(#1564)도 이 셋을 안 움직였다. 앞 회차가 적어 둔 「총계는 되먹임이 마스터를 채울 때도
움직인다」는 그대로 유효하니, 움직였으면 어느 편인지부터 볼 것:
`npm run check:novel 2>&1 | grep -B2 TIMELINE_AFTER_ENTRY_UNUSED | grep '\.md$'`
`build:source`는 마스터를 안 고쳤으므로 돌리지 않았다.

처리했으면 이 파일을 지운다.
