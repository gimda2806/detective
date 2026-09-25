### 2026-09-25 · claude/wizardly-hamilton-z3vpff → 전체

**한 것**

- 소설화 **스물아홉 번째 줍기 회차 — CASE267 한 편**([docs/novels/CASE267.md](../novels/CASE267.md),
  「명단이 바뀌던 저녁」). `docs/novels/README.md`의 표 한 행 · 줍기 포인터 · 회차 절을 갱신했고
  **번호순 회차의 「다음 차례」 줄과 판본 대조 갈래의 포인터는 건드리지 않았다.**
- **마스터·판본은 한 파일도 고치지 않았다.** `data/`는 손대지 않았으므로 다른 세션과 겹칠 파일이 없다.
- `docs/archetype-gaps.md`의 「어느 칸에도 안 들어가는 것」 표에 한 줄(CASE267의
  `cover_up_target`·`cover_up_method`가 **둘 다 `other`인 이유** — 은폐가 「더한 것」이 아니라
  「되돌린 것」이라 맞는 칸이 없다. 마스터가 이미 `other`로 적어 둔 것을 검산만 했고 값은 그대로다).
- `check:novel`은 이 편 **errors 0 · warnings 2**(둘 다 `TIME_NOT_IN_MASTER` — 소설이 메운 시각이
  「보탠 것」에 적혀 있다는 뜻).

**해야 할 것**

- 없다. 아래 둘은 알림이다.
- **세 갈래가 전부 비었다.** 회차를 시작하면서 셋을 다 세었다.
  - 줍기: `for d in $(ls data/pending-cases/); do [ -f "docs/novels/$d.md" ] || echo $d; done`
    — 시작할 때 `CASE267` 하나, 이 편으로 **0**.
  - 판본 대조: `for f in data/pending-cases/*/Case-No-*.offline.json; do id=$(basename $(dirname $f)); grep -q "판본이 따로 더한 것" docs/novels/$id.md || echo $id; done`
    — **비어 있다**(판본 열셋 전부에 그 절이 붙어 있고 새 `.offline.json`이 생긴 번호가 없다).
  - 번호순: 표의 마지막이 **CASE317**이고 코퍼스 끝이 **CASE318**인데 318에는 이미 소설이 있다.
  **그러니 다음 소설화 회차의 일감은 생성 루틴이 새 번호를 머지해 주어야 생긴다.** 세 줄을 먼저 돌려 보고
  셋 다 비어 있으면 **없는 일을 만들어 쓰지 말 것** — 열 번째 겹침(CASE318)이 그렇게 났다.
- **`check:case`에 칸 하나가 비어 있다(CASE267에서 처음 본 모양).**
  `opening_scene.narrative`가 초대장의 '저녁 6시 반'에 **"그 시간에 맞춰 로비에 들어섰다"**고 적는데
  `detective_entry_time`은 **19:24**다. `T11`(19:08 발견)·`T12`(19:12)가 진입 앞에 서 있으므로
  **19:24 쪽이 맞는 값이고 산문이 틀렸다.** `check:novel`의 `ENTRY_TIME_MISMATCH`는 *소설 1장의 시각*과
  `detective_entry_time`을 견줄 뿐 **마스터 자신의 산문과는 견주지 않으므로, 이 어긋남을 보는 눈이
  원본 쪽에 하나도 없다.** `validate_master.ts`에 「`opening_scene.narrative`에 HH:MM이나 「N시 반」이
  있으면 `detective_entry_time`과 견준다」 한 줄이면 잡힌다 — **검사기를 고치는 것은 이 루틴의 일이
  아니라 적어만 둔다.** 소설은 두 값을 다 살리는 쪽으로 50분을 메웠다(그 편의 「보탠 것」 1번).
