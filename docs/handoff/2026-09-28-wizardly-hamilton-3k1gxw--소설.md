# 다음 소설 회차에게 — 다음은 CASE370이다. **첫 문단에서 장 제목 시각을 되풀이하지 말 것**

보낸 곳: `claude/wizardly-hamilton-3k1gxw` (소설 루틴, CASE369 회차, 2026-09-28)

## 한 것

`docs/novels/CASE369.md`(「지워진 두 줄」) 한 편, 15장. **마스터는 한 글자도 안 고쳤다** —
`audit:duplication` 상위 15에 없었고 한 사건 안의 겹침도 사실상 0건이었다. 회차 기록은
`docs/novels/rounds.md`의 CASE369 회차 절이다. 앞 회차 쪽지(`fttqcl`)는 처리했으므로
지웠다 — 열한 항목을 전부 그대로 썼고 어느 것이 맞았는지는 회차 기록에 적었다.

닫을 때 센 것은 **① 10(CASE370~CASE379 연속) · ② 0 · ③ 마스터 377 / 소설 370**이다.
①과 ③이 또 같은 번호를 가리킨다 — **열두 회차 연속으로 갈래를 고를 일이 없다.**
그래도 세 줄은 직접 돌릴 것.

**회차 도중에 `main`이 한 번 움직였다**(`6ec2c4c6` → `f4a7e527`, 되먹임 루틴의 CASE367
#1568). **새 사건은 안 들어왔다** — 큐가 11 → 10으로 **처음으로 줄었다**(다섯 회차의
변화가 12 → 11 → 11 → 11 → 10). 앞 회차가 적어 둔 「소설 한 편 쓰는 동안 생성이 한 편
넣는 것이 정상 속도」는 **이번엔 안 맞았다.** 열 때의 `git fetch`는 또 force update 였다
(네 회차 연속).

## 첫째 — **`TIME_UNRECORDED`의 진짜 정체는 장 제목 되풀이다.** 이걸 제일 먼저 볼 것

이번 회차에서 가장 크게 건진 자리다. 첫 실행에서 `TIME_UNRECORDED`가 **다섯** 떴는데
**전부 장 제목의 시각을 첫 문단에서 되풀이한 것**이었다 — 「## 3. 로비 및 보안데스크,
밤 10시 45분」 밑에 「밤 10시 45분, 두 사람은 1층으로 내려왔다」라고 쓴 자리다.

**제목의 시각은 안 세고 본문은 센다.** 그러니 **되풀이가 곧 지어낸 시각이 된다** —
수사가 거기까지 걸린 시간은 마스터에 있을 리가 없으니까. 첫 문단에서 시각 한 덩이만
빼면 다섯이 한꺼번에 0이 됐고, **장면 시각 검사는 제목으로 그대로 돈다**
(`titleTimeOf(paragraphs[0]) ?? sceneTimeOf(paragraphs[1])` — 제목이 먼저다).

앞 회차 쪽지의 셋째(배경으로 지어낸 시각)는 **한 건도 안 났다** — 쪽지가 준 시각 스캔
한 줄을 먼저 돌려 쓸 값을 정해 뒀기 때문이다. **그 한 줄을 그대로 물려준다:**

```bash
node -e 'const m=require("./data/pending-cases/<ID>/<ID>.master.json");const s=new Set();
const w=v=>{if(typeof v==="string"){for(const x of v.matchAll(/(\d{1,2}):(\d{2})/g))s.add(x[0]);}
else if(Array.isArray(v))v.forEach(w);else if(v&&typeof v==="object")Object.values(v).forEach(w);};
w(m);console.log([...s].sort().join(" "))'
```

## 둘째 — 진입 뒤 항목은 이제 **몇 개인지보다 그중 몇이 은폐인지**를 센다

앞 회차 쪽지의 둘째가 이번에도 가장 크게 맞았다. CASE368은 진입 뒤가 둘이었는데
**CASE369는 여섯이고 그중 넷이 전부 은폐다**(`T14` 외장하드 은닉 · `T15` 메일 삭제 ·
`T16` 출입기록 삭제 · `T17` 라벨 교체). 넷이면 **한 편의 축이 된다** — 탐정이 자리를 비운
사이마다 범인이 한 칸씩 움직이고, 탐정은 범인이 만드는 증거를 만들어지는 순서대로 줍는다.

쪽지가 준 한 줄에 **은폐인지 아닌지를 눈으로 가르는 것**만 더하면 된다:

```bash
node -e 'const m=require("./data/pending-cases/<ID>/<ID>.master.json");
const e=m.opening_scene.detective_entry_time;console.log("entry:",e);
for(const t of m.actual_timeline) console.log(t.id,t.time,t.location,(t.actors||[]).join(","),"|",t.actual_action.slice(0,40));'
```

## 셋째 — **자정을 넘기는 편은 「새벽」으로 적으면 된다.** 제목에서 시각을 빼지 않아도 된다

README는 「다음 날로 넘어가는 장은 제목에 시각을 적지 않는다」고 하는데, 그건 **「이튿날
아침」처럼 날짜 말을 쓸 때**의 얘기다. CASE369는 진입이 21:47이라 **9장부터 자정을
넘겼는데**, 「## 9. 시약보관실, 새벽 0시 15분」으로 적으니 그대로 돌았다.

검사기의 자정 넘김 어림이 「직전 장이 저녁·밤(hour ≥ 18)이고 지금이 6시 전」일 때
**한 번만** 돈다(`day += 1`). 8장(밤 11시 55분) → 9장(새벽 0시 15분)에서 한 번 넘고,
`day`가 그대로 유지되므로 **그 뒤 여섯 장이 전부 이어진다.** 「밤 12시 20분」은 쓰지 말 것
— `밤` + hour 12 는 시간대 보정이 안 붙어 정오로 읽힐 자리다. **`새벽 0시`·`새벽 1시`가
안전하다.**

「이상 없음」이 「검사가 돌았다」인지는 셋으로 쟀다 — 7장 제목 앞당겨 `TIME_BACKWARD`,
1장 제목을 진입보다 늦춰 `ENTRY_TIME_MISMATCH`, 본문 한 곳을 「아홉 시 45분」으로 바꿔
`TIME_NATIVE_NUMERAL`. 셋 다 되돌리고 `diff`로 확인.

## 넷째 — **`check:novel`이 못 잡는 어긋남이 있다: 카드와 타임라인이 같은 일을 다른 시각으로 적는 것**

CASE369는 `E08`이 「22시 55분경 메일 여섯 통 삭제」라 적고 `T15`는 23:10이라 적는다.
15분 차이고 그 사이에 `T14`(22:50)가 끼어 있다. **`check:novel`은 이걸 절대 못 잡는다** —
둘 다 마스터에 있는 값이라 소설이 어느 쪽을 써도 `TIME_NOT_IN_MASTER`에도
`TIME_UNRECORDED`에도 안 걸린다. **마스터 안의 시각을 서로 맞춰 보는 검사는 없다.**

소설은 **22:55를 로그 시각, 23:10을 목격 시각**으로 읽어 둘 다 살렸다. 같은 자리를 만나면
이렇게 화해시킬 수 있는지부터 보고, 안 되면 백로그로. 한 줄로 센다:

```bash
node -e 'const m=require("./data/pending-cases/<ID>/<ID>.master.json");
for(const t of m.actual_timeline) console.log("T",t.id,t.time,"|",t.actual_action.slice(0,30));
for(const e of m.evidence) { const h=[...e.content.matchAll(/(\d{1,2})[:시]\s*(\d{1,2})?/g)].map(x=>x[0]); if(h.length) console.log("E",e.id,h.join(","),"|",e.name); }'
```

## 다섯째 — 보드 오답은 이제 **반박자가 몇 명에 몰렸는지**를 같이 센다

앞 회차 쪽지의 다섯째를 확장한다. `refutation_releases` **0/6으로 두 회차 연속**이고,
「자기가 심은 답을 자기가 걷어 낸다」도 **여기서 또 둘**이었다(`T02`·`H02`, 둘 다 `CH04`).
새로 잰 것은 **쏠림이 턴 수로 나온다**는 것이다 — `CH04` 하나가 여섯 중 **넷**을 반박하고
`CH05`는 0이라 확정이 **109.0턴**이었다(앞 네 편 68·35·120·87). CASE367이 120턴을 같은
이유로 적어 뒀다. 쪽지의 `jq` 한 줄에 **반박자 도수**만 더하면 된다:

```bash
node -e 'const m=require("./data/pending-cases/<ID>/<ID>.master.json");const c={};
for(const x of [...m.motives,...m.times,...m.methods]) if(!x.truth){
c[x.refuted_by]=(c[x.refuted_by]||0)+1;
console.log(`${x.id} by=${x.refuted_by} rel=${JSON.stringify(x.refutation_releases||"—")} sugg=${JSON.stringify(x.suggested_by)}`);}
console.log("반박자 도수:",c);'
```

## 여섯째 — 「산문이 부르는데 데이터에 없는 것」은 **장소만이 아니다. 물건도 본다**

앞 회차 쪽지의 아홉째 둘째 항목(주방 복도)과 같은 자리인데, 이번엔 **물건**이었다.
CASE369의 **방염금고**는 `full_truth.method`·`cover_up`·`T04`·`T09`·`T14`·
`final_deduction.method` **여섯 자리**가 부르는데 `locations`·`evidence`·`characters`
어디에도 없다. `L03.base_description`은 선반·센서 패널·문가까지만 부르고 `detail_rules`
셋에도 금고가 없다. **피해자가 그것을 가지러 들어갔다가 죽은 사건인데 그렇다.**

```bash
node -e 'const m=require("./data/pending-cases/<ID>/<ID>.master.json");
const w=(o,p)=>{if(typeof o==="string"){if(o.includes(process.argv[1]))console.log(p)}
else if(Array.isArray(o))o.forEach((v,i)=>w(v,p+"["+i+"]"));
else if(o&&typeof o==="object")Object.entries(o).forEach(([k,v])=>w(v,p+"."+k));};
w(m,"")' <낱말>
```

**고르는 법**: `full_truth.method`와 `key_time_location`을 읽고 **거기 나오는 명사 서넛**을
이 한 줄에 넣어 본다. `locations`·`evidence`에 한 번도 안 뜨면 그 자리다.

## 일곱째 — 필수 표가 안 보는 자리 둘은 **또 연속이다**

- **증언·물증이 걸린 방의 `detail_rules` 개수.** CASE366(로비 0)·CASE367(사랑채 0)·
  CASE368(매화실 1)·**CASE369(`L06` 0 — 증언 카드 셋이 걸린 방)**. **네 회차 연속.**
- **`comic_tell`이 같은 물건인가.** CASE368은 넥타이 둘, **CASE369는 문구류 셋**
  (펜 딸깍 · 볼펜 귀 · 다이어리 두드리기). **두 회차 연속.** 필수 표는 「있는가」만 센다.
- **`formality_register`와 대사 어미.** 여기도 넷 이상이었다(하유경 진술 셋 + 명노섭 보드
  반박 넷이 **첫 문장 합니다체 / 둘째 문장 해요체**로 갈린다). **두 회차 연속.**

## 여덟째 — `presentation_effect`가 빈 카드는 **`case_complete`와 대조해서 볼 것**

앞 회차 쪽지의 여덟째를 한 칸 좁힌다. CASE369는 `E10`~`E18` **아홉 장**이 비어 있는데,
그중 **`E18`은 `case_complete.required_established_facts`의 유일한 카드**다. 사인을
확정하는 문서가 종결 조건이면서 대립에는 못 쓰인다. **빈 `presentation_effect`를 셀 때
`case_complete`에 이름이 있는 카드부터 본다.**

같은 자리에서 하나 더 나왔다 — **`E10`이 `S-CH01-02`와 글자까지 같다**(README 「같이 보는
다섯」 4번). `C01`은 진술 쪽만 보고 카드 쪽은 빈칸이라 **주워도 쓸 데가 없다.**

## 아홉째 — 넘긴 것

- 백로그 「마스터가 어긋난 자리」 절에 **CASE369 열세 줄.** 가장 무거운 셋은 위 넷째
  (`E08`/`T15` 15분)·여섯째(방염금고)·다섯째(반박자 쏠림 109턴)이고, **정답 세 칸의
  근거가 전부 카드 한 장씩**인 것은 **다섯 회차 연속** 맞았다(여기는 셋 다 안 잠겨 있어
  사슬은 안 끊긴다 — 잠금이 아니라 장수가 문제다).
- 소설 쪽 「오프라인으로 옮길 것」에 **새 카드 셋**(방염금고를 보는 칸 · 지워지기 전 화면을
  본 증언 · 병마개)·**기존 값에 한 줄 여섯**·`requires` 네 칸.

## 환경

`npm ci`는 **네 회차 연속** 그냥 된다. 3분쯤 걸리고 `check:case`·`check:offline`·
`check:novel` 셋 다 돈다. 열자마자 돌리고 넘어갈 것.

`check:case CASE369`(errors 0, warnings 1 — `COVER_UP_TARGET_OVERUSE` 하나뿐이고 등록된 사건이라 warn이다. 코퍼스 쏠림 보고라 안 고쳤다) → `check:offline CASE369`(완주 1, 보드 네 칸
확정, **109.0턴**, 텍스트 이상 0) → `check:novel`(errors 0, warnings **466** —
`TIME_NOT_IN_MASTER` 353 · `TIME_UNRECORDED` 85 · `TIMELINE_AFTER_ENTRY_UNUSED` 28).
**앞 회차와 같은 값이다** — CASE369는 셋 다 0이고, 회차 도중에 머지된 CASE367 되먹임
(#1568)도 이 셋을 안 움직였다. 총계가 움직였으면 어느 편인지부터 볼 것:
`npm run check:novel 2>&1 | grep -B2 TIMELINE_AFTER_ENTRY_UNUSED | grep '\.md$'`
`build:source`는 마스터를 안 고쳤으므로 돌리지 않았다.

처리했으면 이 파일을 지운다.
