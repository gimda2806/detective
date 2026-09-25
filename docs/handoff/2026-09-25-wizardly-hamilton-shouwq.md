### 2026-09-25 · claude/wizardly-hamilton-shouwq → 전체

**한 것**

- 소설화 **스물네 번째 줍기 회차 — CASE183 한 편**([docs/novels/CASE183.md](../novels/CASE183.md),
  「목줄을 놓은 저녁」). `docs/novels/README.md`의 표 한 행(제목)·줍기 포인터·회차 절을 갱신했고
  **번호순 회차의 「다음 차례」 줄은 건드리지 않았다.** 줍기 대상은 다시 0이다
  (`for d in $(ls data/pending-cases/); do [ -f "docs/novels/$d.md" ] || echo $d; done`가 비어 있다).
- **`data/pending-cases/CASE183/CASE183.master.json`을 고쳤다(문장만, 진상·시각·인물·수법은 그대로).**
  다른 세션이 이 파일을 들고 있으면 충돌할 수 있어 적어 둔다. 고친 것은 둘이다.
  - **다른 무대(승마 시설)의 낱말 일곱 군데** → 사육동·재활 훈련실·개로.
    `key_figures[V01].role`「마구간 총괄 관리인」 · `E05.mismatch` · `E05.reaction.jiwoo` ·
    `E14.proves`「연습장」 · `CH02.pressure_responses[0]`「말 상태」 · `R02.actual_reason`「마사 뒤편」 ·
    `R02.suspicion_deepener`「마사에」. **뒤의 셋 중 둘은 게임 화면에 그대로 나가는 말이다**
    (한지우 대사 · 압박 응대).
  - **저녁 시각을 시간대 말 없이 12시간제로 적은 일곱 군데** → 「오후」·「저녁」을 붙였다.
    `E01`(둘) · `E02` · `E07` · `F-CH02-01` · `F-CH05-01` · `F-CH05-02`. 같은 카드의 `proves`는
    24시간제여서 `E01` 한 장이 06:15와 18:10을 같이 들고 있었다.
  - 고친 뒤 `check:case CASE183`(errors 0 · warnings 0 — 고치기 **전에도** 0이었다) ·
    `build:source CASE183` · `check:offline CASE183`(완주 1/1) · `check:novel`(이 편 0/0,
    코퍼스 총계 356 그대로) · `tsc --noEmit` 통과.
- `docs/archetype-gaps.md`의 「무엇을 보고 골랐나」 표에 두 줄(CASE183 `location`·`background_phrasing`).

**해야 할 것**

- 없다. 아래는 알림이다.
- **위 두 종류가 어느 검사에도 안 걸린다.** `audit:duplication`은 «뼈대»로 문장을 견주므로
  **문장은 안 겹치면서 무대만 다른** 첫째 종류를 통째로 못 본다. 둘째 종류는 `check:novel`의
  `TIME_12H_MISMATCH`가 소설에만 대고 잡고 마스터 쪽에는 같은 검사가 없다 —
  `validate_master.ts`에 「한 문자열 안에 13 이상의 시와 12 이하의 시가 같이 나오면」 한 줄이면
  이 편의 `E01`·`E02`가 걸린다. **150~156 · 168~169 · 182~186 회차가 같은 한 줄을 불렀고 이번이 넷째다.**
- CASE183은 `connects_to`가 `L01`에만 있다(`L02`~`L05`는 필드 자체가 없다). 판본을 만들 때
  방↔방 이동이 통째로 없는 상태에서 출발한다는 뜻이고, 소설 맨 뒤 「오프라인으로 옮길 것」에 적어 뒀다.
