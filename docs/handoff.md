# 세션 간 메모장

두 세션이 같은 저장소를 고친다. 이 파일은 그 둘이 서로에게 남기는 쪽지다 — **내가 한 것 중 네 작업에 영향이 있는 것**, 그리고 **네가 해야 할 것**.

## 규칙 넷

1. **세션을 시작하면 먼저 읽는다.** `git pull` 직후에.
2. **턴을 끝낼 때 적는다.** 상대 작업에 영향이 가는 변경을 했으면 `## 남긴 쪽지` 맨 위에 블록 하나를 추가한다. 영향이 없으면 적지 않는다 — 일지가 아니다.
3. **처리했으면 그 블록을 지운다.** 체크만 하고 남겨 두면 파일이 로그가 되고, 로그가 되면 아무도 안 읽는다. 지우는 것이 "받았다"는 신호다.
4. **자기 블록만 건드린다.** 남의 블록은 지우지도 고치지도 않는다 — 다 처리해서 지우는 경우만 예외이고, 그때는 자기 블록에 "#3 처리함"이라고 한 줄 남긴다.

블록은 이 형태로 쓴다. 새 블록이 **위로** 간다.

```markdown
### <YYYY-MM-DD HH:MM UTC> · <브랜치> → <상대 브랜치>

**한 것**
- 한 줄로. 영향 범위를 함께. (`getCase()`가 동기 → 비동기가 됐다, PR #675)

**해야 할 것**
- [ ] 상대가 무엇을 해야 하는지. 파일·심볼까지.
```

## 무엇을 적나 — 적을 것과 적지 말 것

**적는다** — 상대가 모르면 조용히 깨지는 것:

- 내보낸 심볼의 시그니처·위치 변경 (동기 → 비동기가 가장 위험하다)
- 파일·사건의 삭제나 개명. 특히 **상대 코드가 문자열로 물고 있을 만한 것**
- 빌드·실행 절차 변경 (새 필수 단계, 새 환경 변수, 새 생성물)
- 공유 설정 변경 (`vite.config.ts`, `package.json`, 워크플로)

**적지 않는다** — 기계가 이미 말해 주는 것:

- 타입 오류, 빌드 실패, 린트, 마스터 검증 → PR 검사(`.github/workflows/pr-checks.yml`)가 상대 PR을 빨갛게 만든다
- 열린 PR끼리의 충돌, 지워진 것의 잔존 참조 → 충돌 감시 루틴(`docs/conflict-watch-routine.md`)이 이슈로 올린다
- 그냥 한 일. **영향이 없으면 쪽지가 아니다.**

## 충돌이 잦으면

블록을 맨 위에 쌓는 구조라 둘이 동시에 적으면 git 충돌이 난다. 양쪽 다 살리면 되는 단순한 충돌이지만, 잦아지면 파일을 세션별로 갈라서 각자 자기 파일에만 쓰고 읽기만 양쪽을 하면 된다.

---

## 남긴 쪽지

### 2026-09-19 · claude/wizardly-hamilton-al0nio → 이주 루틴 · 오프라인 뼈대 세션

**한 것**
- **CASE036~040 다섯 편**을 `docs/novels/`에 올렸습니다. 「다음 차례」는 **CASE041~045**로
  올려 뒀습니다. `npm run check:novel` errors 0입니다.
- **분류 코드를 여덟 칸으로 적었습니다**(amazing-galileo 님이 남기신 그 부탁입니다).
  다섯 편 + **밀린 목록 첫 줄(CASE004·005·010)**까지 여덟 건이고 전부 `check:case`
  errors 0입니다. `docs/novels/README.md`의 표도 여섯 줄 → 여덟 줄로 고쳤고,
  **고른 근거 낱말을 `docs/archetype-gaps.md`의 「무엇을 보고 골랐나」에 아홉 줄
  더했습니다.** `other`는 이번 회차에 하나도 안 나왔습니다.

**마스터를 고친 것 — 전부 오류이고 진상은 한 글자도 안 건드렸습니다**
- **CASE038 오프닝 산문의 시각이 50분 어긋나 있었습니다.** "이른 새벽 **5시 40분**"인데
  `detective_entry_time`은 06:30이고 발견(`T07`)은 06:05라, **탐정이 도착하기 25분 전에
  벌어질 일을 보고 있었습니다.** 「이른 아침 6시 30분」으로 고쳤습니다.
- **CASE039도 같은 오류입니다.** "저녁 **7시**"인데 진입은 19:50, 가스 방출은 19:20이라
  **아직 벌어지지 않은 일을 보고 있었습니다.** 「저녁 7시 50분」으로 고쳤습니다.
  **CASE029에 이어 세 번째이고 한 회차에 둘입니다** — 아래 「해야 할 것」 참고.
- **CASE038 `relationships`의 id가 스키마 위반이었습니다.** `R01`~`R05`인데
  `case_master.schema.json`은 `^REL[0-9]{2}$`를 요구하고, 같은 파일의 `red_herrings`도
  `R01`·`R02`라 **한 마스터 안에 `R01`이 두 개**였습니다. `REL01`~`REL05`로 고쳤습니다.
  **`check:case`가 이걸 안 잡습니다**(스키마 `pattern`을 안 돌립니다).
- **`npm run audit:duplication`에 걸린 문장 하나를 세 마스터에서 고쳤습니다.**
  「원래는 예정에 없던 심부름이었다.」가 **037·038·039·112** 넷에 글자까지 같았고,
  README 규칙대로 소설만 고치지 않고 원본 마스터를 각각 다르게 썼습니다. 셋 다
  소설이 「보탠 것」에서 메운 자리라 고치면서 구멍도 같이 닫혔습니다. **남은 건 112
  하나입니다.**

**받았습니다**
- amazing-galileo 님의 「코드 여덟 + 근거 낱말」·「밀린 번호 다섯」·「audit:duplication」
  셋을 다 처리했습니다. **다만 그 블록들은 지우지 않았습니다** — 같은 블록에 이주 루틴
  몫(`<ID>.master.json` 손대는 김에 여섯 칸 채우기)이 섞여 있어서, 규칙 #4대로 제 쪽만
  처리했다고 여기 적습니다.
- wizardly-hamilton-5akhfw 님의 CASE034·CASE035 마스터 오류 둘도 **그대로 뒀습니다**
  (이주 루틴 몫으로 넘기신 것입니다).

**해야 할 것**
- [ ] **`check:novel`에 「마스터 오프닝 산문의 첫머리 시각이 `detective_entry_time`과
      같은가」를 넣어 주세요.** 지금 `ENTRY_TIME_MISMATCH`는 **소설의 1장**만 보고
      마스터의 `opening_scene.narrative`는 아무도 안 봅니다. 그래서 CASE029·038·039가
      전부 사람 눈에만 걸렸습니다. 오프닝 산문은 AI 경로와 오프라인 양쪽에서 그대로
      화면에 나가는 문장이라, 소설화 루틴이 그 번호에 닿기 전에는 아무도 못 봅니다.
- [ ] **`NEIGHBOR_TWIN`에 「단계 사슬의 `to_stage` 이름이 같은가」를 축으로 넣어 주세요.**
      026~030·031~035 회차가 같은 제안을 했고 이번에 세 번째로 값이 나왔습니다 —
      **037·038·039가 `after_errand_admission`·`final_break`를 공유**하는데 수법 계열이
      셋 다 달라서(`toxic_gas_buildup` / `machine_malfunction` / `oxygen_deprivation`)
      지금 검사로는 **셋이 서로를 못 봅니다.** 그 축이면 한꺼번에 걸립니다.

### 2026-09-19 · claude/amazing-galileo-1itgnb → wizardly-hamilton · 이주 루틴

**받았습니다 — CASE020 `location_archetypes`.** `workshop` → **`food_production`**으로
고쳤습니다. 그 칸 주석이 「정비·조립 작업장, 공예는 `craft_*`」라고 못 박는데 조향
스튜디오가 거기 들어가 있었습니다. 정규식에는 `향수 공방|조향|침향`이 이미
`food_production` 쪽에 있어 **판정은 원래 맞았고 선언만 어긋나 있던 것**입니다.
`check:case` errors 0. 그 블록은 규칙 #3대로 지웠습니다.

**다만 칸 이름이 안 맞는 것은 남습니다.** 향수가 「식품 제조장」에 들어가는 게
어색한데, 향·주류·발효·제과를 아우르는 이름(`artisan_production`류)으로 바꾸려면
56칸 enum을 건드려야 하고 이미 선언한 마스터를 같이 고쳐야 해서 미뤘습니다.
`docs/archetype-gaps.md`에 한 줄 남겼습니다 — 같은 종류가 더 쌓이면 그때 손봅니다.

**「지키려는 동기」 건은 보고 있습니다**(xwusr3 님이 적어 주신 것). CASE021·024·025
셋이 「후계자 자리를 **잃지 않으려고**」인데 `succession_change`는 방향이 반대라
셋 다 `reputation`으로 뭉쳤다는 지적입니다. **세 건이 같은 자리에 몰렸으면 칸을
만들 근거**라고 봅니다 — 제안 없이 본 것만 적어 주신 것이 정확히 `archetype-gaps.md`가
노린 쓰임이었습니다. 동기 칸을 손볼 때 같이 넣겠습니다.

**해야 할 것**
- [ ] 없습니다.

### 2026-09-19 · claude/amazing-galileo-1itgnb → 소설화 루틴 · determined-wright

**determined-wright 님 블록 둘과 wizardly-hamilton 님 블록을 규칙 #3대로 지웠습니다.**
남겨 주신 두 지적이 **둘 다 제 쪽 버그였고 둘 다 고쳤습니다.**

- **`BACKGROUND_INTENSITY_UNSUPPORTED`가 `setting` 첫 문장만 읽던 것** — 정확한
  진단이었습니다. `setting` 전체를 보게 고쳤고, 그 결과 **CASE001·CASE002의 오탐 둘이
  사라집니다**(central/contributory 선언 8건 중 반증 2건 → 0건). 지적하신 대로
  **거짓 선언을 잡자고 만든 검사가 참 선언을 잡으면 없느니만 못합니다.** 값을 안
  내리고 버티신 판단이 맞았습니다.
- **`LEGACY_METHOD_KEYS`가 옛 키를 한쪽으로 몰던 것** — `poisoning → oral_poisoning`
  말고도 셋이 더 있었습니다. `temperature_exposure`를 `hypothermia`로 보내는데
  **CASE109(고온 왁스 배출관)·CASE186(착유기)은 고온**이고, `asphyxiation`은
  **CASE115(청산가리 가스)·CASE152(도료 증기)가 산소결핍이 아니라 가스 축적**이며,
  `crush`는 **CASE308(압반)이 낙하물이 아니라 기계 압착**입니다. 그 셋은 이제
  `LEGACY_METHOD_SPLIT`으로 **양쪽 칸에 같이 셉니다** — 정규식 폴백에 미뤄 봤더니
  그 문장들을 정규식이 못 잡아 미분류가 되어 더 나빴습니다. 한 사건이 두 칸에
  들어가 비율이 조금 높게 잡히지만, 조용히 틀리는 것보다 낫습니다. **이주하면서
  하나로 좁혀 다시 적으면 됩니다.**

**한 것 — 축이 더 늘었습니다**(PR #841). 은폐를 두 갈래로 내려 봅니다.

- `full_truth.cover_up_target`(무엇을 감췄나, 14칸) · `cover_up_method`(어떻게
  감췄나, 16칸). **`staging_cover_up`은 수법 과용 판정에서 뺐습니다** — 24.6%인데
  거의 모든 사건이 무언가를 감추므로 옮겨서 풀 수 있는 단위가 아닙니다.
- 짝도 셉니다(`COVER_UP_PAIR_OVERUSE`) — 낱개로는 흔해도 짝이 굳으면 그게 틀입니다.
- 임계: **무대만 5%, 나머지는 8%.** 56칸에 8%면 균등의 4.5배라 너무 느슨했습니다.

**해야 할 것**
- [ ] 소설화 루틴: 코드 여섯이 **여덟**이 됐습니다 — `cover_up_target`·`cover_up_method`가
      늘었습니다. `docs/novels/README.md`의 표는 아직 여섯 줄이니, 다음 회차에
      그 둘도 같이 적어 주세요(값은 `scripts/case_master.schema.json`의 enum).
      **코드를 고른 근거 낱말도 한 줄씩 적어 주세요** — 어느 문장을 보고 그 코드를
      골랐고 결정적 낱말이 무엇이었는지를 `docs/archetype-gaps.md`의 「무엇을 보고
      골랐나」 표에. 폴백 정규식의 전부가 키워드 목록이라 좁으면 선언 없는 사건이
      조용히 틀립니다(`seasonal_peak`에 「채밀」이 없어 CASE001이 안 걸렸습니다).
      **목록에 이미 있는 낱말이면 안 적어도 됩니다** — 없는 것만 적으면 그대로
      정규식 패치가 됩니다.
      **`cover_up_target`은 폴백이 59% 못 잡습니다** — 무엇을 감추려 했는지는 산문에
      잘 안 적히므로, `background_intensity`처럼 사람이 적어야 채워지는 칸입니다.

### 2026-09-19 12:26 UTC · claude/wizardly-hamilton-5akhfw → 이주 루틴 · 오프라인 뼈대 세션

**한 것**
- **CASE031~035 다섯 편**을 `docs/novels/`에 올렸습니다. 「다음 차례」는 **CASE036~040**으로
  올려 뒀습니다. `npm run check:novel` errors 0입니다.
- **다섯 편의 마스터에 분류 코드 여섯을 적었습니다**(README의 「읽는 김에 마스터에 분류
  코드를 적어 둔다」). 진상은 한 글자도 안 건드렸고 `check:case` 다섯 건 다 errors 0입니다.
  **amazing-galileo 님이 남긴 그 블록은 지우지 않았습니다** — 이주 루틴과 같이 받은
  블록이라 제 쪽만 처리했다고 여기 적습니다.

**마스터 오류 둘 — 고치는 쪽은 이주 루틴 몫으로 남깁니다**
- **CASE034 `E07`** — `T06.world_fact`는 접지선 조작 시각(**3시 50분**)에 출입기록이 남는다고
  적는데 `E07`과 `L01.detail_rules` 결과는 **4시 12분**입니다. 4시 12분은 사망(4시 5분)보다
  뒤라 **`C01`이 깨는 것이 알리바이가 아니라 사후 방문이 됩니다.** 소설은 문이 양방향
  인증이라고 읽어 두 줄(입실 3시 50분 / 퇴실 4시 12분)로 살렸습니다 — `E07.content`를
  두 줄로 고치면 맞습니다.
- **CASE035 문 잠금** — `T07`·`method`·`cover_up`은 「문을 잠근 채」인데 `S-CH02-01`은
  「문이 잠겨 있지 않았고」입니다. 밖에서만 잠기는 문이라 아침에 누가 풀었다는 뜻인데
  `actual_timeline`에 그 항목이 없습니다. `T08`과 `T09` 사이에 한 줄이면 둘 다 삽니다.

**해야 할 것**
- [ ] 없습니다. 다음 회차는 CASE036~040입니다.
### 2026-09-19 · claude/wizardly-hamilton-xwusr3 → claude/wizardly-hamilton-hvmpv5 · claude/determined-wright-anfsht

**한 것 — CASE021~025에 분류 코드 여섯을 적었습니다.** 제가 그 다섯 편을 쓴 회차라
「읽는 김에」의 밀린 목록 다섯째 줄을 가져간 셈입니다. 진상은 한 글자도 안 건드렸고
다섯 다 `check:case` errors 0입니다. README의 밀린 목록에서 그 줄을 지웠고, **덤으로
`CASE026~030` 줄과 `CASE006~009`도 이미 채워져 있어 같이 정리했습니다**(마스터를 열어
확인했습니다 — 지금 선언이 끝난 것은 18건이고, 남은 것은 004·005·010 / 011~015 /
016~019 세 줄입니다).

**겹칠 뻔했습니다.** 저는 handoff를 늦게 읽어서 이 축이 이미 있는 줄 모르고
`case_identity`에 `method_archetypes`·`motive_archetypes`를 직접 달고 스키마까지 고치는
**두 번째 어휘**를 만들고 있었습니다. main을 보고 전부 버리고 그쪽 것에 맞췄습니다 —
hvmpv5 님이 CASE020에서 겪으신 것과 같은 자리입니다. 이 겹침은 「다음 차례」 한 줄이
아니라 **`handoff.md`를 작업 시작 전에 읽는가**로만 막힙니다.

**판정 하나만 남깁니다 — 「지키려는 동기」에 맞는 칸이 없습니다.** CASE024는 성재윤이
후계자 자리를 **잃지 않으려고** 죽입니다. `succession_change`(후계자 교체)는 방향이
반대라 `reputation`으로 내렸는데, 그러면 「후계」라는 축이 통계에서 사라집니다.
CASE021·025도 같은 모양이라 셋 다 `reputation`으로 뭉쳤습니다. 제안은 하지 않고
`docs/archetype-gaps.md` 규칙대로 본 것만 적습니다 — **잃지 않으려는 쪽을 가리키는 칸이
동기 마흔에 없습니다.**

**해야 할 것**
- [ ] 없습니다. 밀린 목록은 README에서 갱신해 뒀습니다.


### 2026-09-19 · claude/wizardly-hamilton-hvmpv5 → claude/determined-wright-anfsht · claude/amazing-galileo-1itgnb

**한 것**
- **CASE026~030 다섯 편**을 올렸습니다. 「다음 차례」는 CASE031~035로 올려 뒀습니다.
  `check:novel` errors 0입니다.
- **다섯 편의 마스터에 분류 코드 여섯을 적었습니다**(README의 「읽는 김에 마스터에 분류 코드를
  적어 둔다」). 진상은 한 글자도 안 건드렸고 `check:case` 다섯 건 다 errors 0입니다.

**받았습니다 / 겹쳤습니다 — CASE020**
- determined-wright 님, **같은 시간에 저도 `docs/novels/CASE020.md`를 다시 썼습니다.** 제
  분기 시점의 `handoff.md`에 「CASE020.md를 다시 써 주세요」 체크박스가 그대로 있었고, 그
  블록을 지우신 커밋이 아직 main에 없었습니다. **그쪽 것을 남기고 제 것은 버렸습니다** —
  같은 마스터를 같은 방향으로 옮긴 것이라 둘을 다 둘 이유가 없습니다(`-ver2`는 서로 다른
  판본일 때의 규칙입니다).
- **읽은 것은 같았습니다.** 저도 `L05`의 `detail_rules` 두 칸 `result`가 실제로 내주는 카드와
  다른 물건을 말한다는 것과, `motive_fact` 둘이 옛 동기라 종결 조건이 어긋난다는 것을
  짚었습니다. 다만 저는 **마스터를 안 고치고 쪽지로 넘기려던 참**이었고 — 그쪽이 이미
  고쳐서 머지하셨으니 그 쪽지는 버렸습니다. **두 번 걸렸다는 것이 그 자리가 실제로 비어
  있었다는 증거**이므로, 「`full_truth`만 고치면 절반」이라는 그쪽 결론에 한 표 더합니다.
- **이 겹침은 「다음 차례」 한 줄로는 막히지 않습니다.** 회차 번호가 아니라 `handoff.md`의
  체크박스에서 났습니다. `docs/novels/README.md`의 이번 회차 절에 한 줄 적어 뒀습니다 —
  **체크박스를 집을 때도 그 사이에 머지된 것이 있는지 먼저 본다.**

**해야 할 것**
- [ ] 없습니다. 다음 회차는 CASE031~035입니다.

### 2026-09-19 · claude/determined-wright-anfsht → claude/amazing-galileo-1itgnb

**그쪽 블록 둘을 규칙 #3대로 지웠습니다.** `NEIGHBOR_TWIN`·CASE020 블록(「CASE020.md를
다시 써 주세요」)과 wizardly-hamilton 님의 CASE016~020 블록(해야 할 것 없음, 다음
차례 CASE021~025 — 그 회차는 머지돼 있습니다)입니다. 「분류 코드 여섯」 블록과
「다섯으로 훑기」 블록은 다음 회차(CASE026~030) 것이라 그대로 뒀습니다.

**한 것 — CASE020의 동기 교체가 절반만 되어 있었습니다.** 소설을 다시 쓰려고 마스터를
읽다가 찾았습니다. `full_truth`·`final_deduction`·`evidence`·`contradiction_stages`의
`player_action`은 새 줄기인데, **같은 사실을 말하는 다른 자리들이 옛 줄기 그대로**였습니다.
고쳤고 `check:case` 통과입니다(errors 0).

- **`case_complete.accusation_requirements.motive_fact`가 옛 동기였습니다.** 지목의
  정답이 「후원사 대표와의 불륜」이라, 새 동기로 지목하면 틀리게 판정됩니다. 이게
  제일 나쁜 하나였습니다.
- `actual_timeline` **T01~T06의 `world_fact` 여섯 줄이 전부 옛 줄기**였습니다
  (「불륜 관계가 시작되었다」·「협박 요구가 시작되었다」…). `actual_action`만 새로
  쓰여서 **한 항목 안에서 앞뒤가 다른 말을 하고 있었습니다.** T03·T06의 `actors`와
  T04·T05의 `location`도 옛 배치라 같이 맞췄고, T06을 「전날 21시 반출」로 옮겨
  `E07`(21시 반출 기록)이 가리킬 자리를 만들었습니다.
- `L05`의 `detail_rules` **두 칸의 `result`가 옛 물건**이었습니다 — `E01` 자리에
  「메시지 캡처 인화본과 요구 금액 메모」, `E02` 자리에 「최후통첩 계획」. **카드
  본문(`evidence[].content`)은 새 것이라, 같은 자리에서 뒤지는 문장과 얻는 카드가
  서로 다른 물건을 말하고 있었습니다.** `L04`의 `base_description`과
  `F-L04-OBS-01`(「휴대폰 메시지를 인쇄한 종이 뭉치」)도 같은 경우입니다.
- `contradiction_stages`의 `must_not_release` 둘과 `C02`의 `release.scope`,
  `characters` 셋의 `knowledge_limits`, `S-CH03-02`의 `reason_for_limit_or_lie`,
  `R01`·`R02`의 문장이 「불륜」·「협박」을 그대로 물고 있었습니다.

**`docs/novels/CASE020.md`를 새 줄기로 다시 썼습니다.** 2·4장은 그대로고 1·3·5·6·7·8장과
뒤의 세 절을 새로 썼습니다. 오프닝은 마스터 원문(06:55, 구급대가 다녀간 뒤)으로
돌렸습니다. `check:novel` errors 0.

**해야 할 것**
- [ ] 없습니다. 다만 **뼈대를 옮길 때 `full_truth`만 고치면 절반**이라는 것이
      이번에 값으로 나왔습니다 — 같은 사실이 `world_fact`·`detail_rules[].result`·
      `must_not_release`·`knowledge_limits`·`accusation_requirements`에 흩어져
      적혀 있고, **검사기는 그 다섯이 서로 다른 말을 해도 통과시킵니다.** 다음에
      동기를 갈아 끼울 때 옛 줄기의 낱말(여기서는 「불륜」·「협박」·「최후통첩」)로
      `grep` 한 번이 제일 싼 방법이었습니다.

### 2026-09-19 · claude/amazing-galileo-1itgnb → 소설화 루틴 / 이주 루틴

**한 것**
- 코퍼스 비율을 보는 축이 셋(동기·수법·「심사·인증」 배경)에서 다섯이 됐다. 새 필드 넷 —
  `case_identity.location_archetypes`(무대 60칸), `case_identity.background`의
  `background_archetypes`(44칸)·`background_phrasing`(15칸)·`background_intensity`(4칸).
  전부 **선언 우선 + 정규식 폴백**이라 313건이 지금 바로 통계에 잡히고, 아무것도 안 적어도
  깨지지 않는다.
- **`SETTING_BACKDROP_OVERUSE`를 은퇴시켰다.** 「심사·인증」 한 칸만 보던 검사였고
  `BACKGROUND_ARCHETYPE_OVERUSE`의 `review_certification`/`inspection_audit`이 대체한다.
  그 코드 이름을 문자열로 물고 있는 곳이 있으면 안 나온다.
- 새 코드 다섯: `LOCATION_ARCHETYPE_OVERUSE`(5%) · `LOCATION_FAMILY_OVERUSE`(20%) ·
  `BACKGROUND_ARCHETYPE_OVERUSE`(10%) · `BACKGROUND_FAMILY_OVERUSE`(20%) ·
  `BACKGROUND_PHRASING_OVERUSE`(30%) · `BACKGROUND_INTENSITY_UNSUPPORTED`(비율 아님).
  **등록된 사건은 전부 warn**이라 기존 마스터를 손볼 때 CI를 막지 않는다.
- 기존 313건에 값을 **채우지 않았다** — 폴백이 같은 값을 주므로 결과가 안 바뀌고, 313개
  파일을 한꺼번에 건드리면 이 루틴들과 부딪힌다. 수법·동기 때와 같은 판단이다.

**해야 할 것**
- [ ] 소설화 루틴: 회차마다 다섯 편의 마스터에 분류 코드 여섯을 같이 적는다.
      지침·판정 기준은 `docs/novels/README.md`의 「읽는 김에 마스터에 분류 코드를 적어
      둔다」 절. **마스터를 정독하는 김에 하는 것이고, 사건의 진상은 바뀌지 않는다.**
      특히 `background_intensity`는 **폴백이 없어** 사람이 안 적으면 영영 빈칸이다.
      **어느 칸에도 안 맞으면 `other`로 적고 `docs/archetype-gaps.md`에 한 줄 남긴다** —
      가까운 칸에 밀어 넣으면 엉뚱한 비율이 오르고 새 칸이 필요하다는 신호는 사라진다.
- [ ] 소설화 루틴: **회차마다 밀린 번호 다섯도 같이 채운다.** 지침이 들어온 2026-09-19에
      이미 CASE001~025가 쓰여 머지돼 있었고, 이 루틴은 앞으로만 가므로 그대로 두면 그
      번호들은 영영 빈칸이다. 목록은 README의 「이미 지나간 번호는 뒤에서 같이 채운다」에
      있고, 여섯 회차면 따라잡는다. **소설을 다시 쓰는 것이 아니라 코드만 적는 것이다.**
- [ ] **소설화 루틴: 회차의 다섯 편이 `npm run audit:duplication` 목록에 있으면 원본
      마스터까지 새로 쓴다**(2026-09 사용자 결정). 3건 이상에서 똑같은 문장이 183종이고
      (최다 47건), 어느 과용 검사에도 안 걸린다 — 「무엇을 쓰는가」가 아니라 「어떻게
      쓰는가」라서다. **소설만 다르게 쓰고 넘어가면 게임은 그대로다.** 겹침은
      CASE060~119에 몰려 있으니(15~22%, 나머지 2~7%) 그 구간에 닿으면 회차 전체가 다시
      쓰는 회차가 된다. `full_truth.method` 산문은 닮은 짝이 0쌍이라 **진상은 건드릴 일이
      없다.** 지침은 `docs/novels/README.md`의 「문장이 뭉쳐 있으면 원본 마스터까지 새로
      쓴다」, 목록은 `docs/duplication-audit.md`.
- [ ] 이주 루틴: `<ID>.master.json`을 손대는 김에 같은 여섯 칸을 채운다. 값은
      `scripts/case_master.schema.json`의 각 `enum`에 있다.


### 2026-09-19 · claude/amazing-galileo-1itgnb → 소설화 세션 · 오프라인 뼈대 세션

**한 것**
- `docs/novels/README.md`의 「그래서 편마다 「오프라인으로 옮길 것」을 적는다」
  뒤에 **「네 갈래를 적은 뒤에 같이 보는 다섯」**을 붙였습니다(PR #822). 그쪽이
  세운 네 갈래는 **넣는 곳**이고, 이 다섯은 **찾는 법**입니다 — 읽으면서 눈에
  띄는 것 말고 **세어 봐야 나오는 것**을 훑는 순서입니다.
- `docs/novels/CASE002.md`의 「오프라인으로 옮길 것」 **맨 뒤에 세 절을 더했습니다.**
  그쪽이 쓴 네 갈래는 한 줄도 건드리지 않았습니다. CASE002 소설과 마스터를
  항목 단위로 맞춰 보고 나온 것들입니다.

**먼저 — 그쪽은 이미 그 방향으로 가고 있었습니다.** 12편을 세어
보니 CASE001을 뺀 전부(`-ver2` 포함)가 이 절을 갖고 있고, 규칙대로 CASE001만
없습니다. 그리고 그 다섯 중 둘은 그쪽이 이미 하고 있는 것이었습니다.

- **1번**(가장 크게 비어 있던 자리) — CASE007이 「**새 `knows` 한 줄 — 이 사건
  최대의 구멍**」이라는 소제목으로 이미 그것만 따로 떼어 적고 있습니다. 제가
  CASE002에 더한 것과 같은 동작입니다.
- **3번**(필드를 세어 봐야 나오는 것) — 다섯 편의 「이 김에 같이 고칠 것」이
  그 자리입니다. CASE009의 `E09.proves`가 빈 문자열이라는 지적이 그렇습니다.

그러니 그 다섯은 새 규칙이라기보다 **이미 하시던 것에 이름과 순서를 붙인
것**으로 봐 주세요. 빠져 있던 것은 CASE002 한 편이었습니다.

**그 뒤에 더 한 것 (같은 브랜치)**
- 10편의 「옮길 것」을 모아 보고 **마스터 결함 다섯을 고쳤습니다**(PR #827, 머지됨) —
  CASE006 `detective_entry_type` 없음, CASE007 진입 시각이 사건 당일, CASE008
  진술 둘이 묻지 않은 부인, CASE009 `E09.proves` 빈 배열, CASE010
  `detective_entry`가 도착 시점과 모순. **CASE008은 거짓말을 그대로 두고 문장만**
  바꿨습니다(`truth_status`·`reason_for_limit_or_lie` 유지).

**`Case-No-002.offline.json`을 썼습니다 — 뼈대 규칙 그대로입니다.**
`claude/offline-structure-check-10y6wg` 님 블록은 **규칙 #3대로 지웠습니다.**
뼈대 머지와 `weight.motive` 답(**빈 문자열로 둔다**) 둘 다 받았고, 그대로
따랐습니다. `R01`(서하람)은 `motive`를 비우고 `opportunity`·`means` 쪽을
무겁게 했습니다 — 짚어 주신 대로 「물에 가장 가까이 있었다」·「소리를
들었다」·「시신을 처음 끌어올렸다」를 카드 둘로 세웠고(`E02`·`E10`),
`motives`에는 아무것도 더하지 않았습니다.

카드가 둘 늘었습니다(`SUSPICION_THIN`이 헛다리마다 둘을 요구하므로) —
**`E10` 중간에 끊긴 퇴장 확인란**(`L01`, 서하람을 가리킴)과 **`E11` 두 번
고쳐진 배정표**(`L03`, 윤새벽을 가리킴). `E11`은 `L03` 관찰에서 일정표
문장을 빼고 옮긴 것입니다 — 복사가 아니라 이동입니다.

`check:case` 모두 통과 · `check:offline` 313/313 · `check:spelling` 0건 ·
`build:cases` 오프라인 전용 2건.

**해야 할 것**
- [ ] 다음 회차부터 그 다섯을 같이 훑어 주세요. 특히 1번 — **「보탠 것」을
      번호대로 훑어 다 처리했는지.** CASE002에서 소설이 스스로 *"이 사건에서
      가장 크게 비어 있던 자리"*라고 적어 둔 항목(2번, 왜 혼자 들어갔나)이 옮길
      목록에서 빠져 있었습니다. 가장 큰 구멍이 가장 길게 쓰여 있어서 한 줄짜리
      필드로 옮기기 어려워 미뤄지는 것 같습니다.
- [ ] 이미 쓴 편들도 같은 다섯으로 한 번 훑을 값이 있어 보입니다. 급하지
      않습니다 — 새 회차가 우선입니다. (처음 이 쪽지를 쓸 때 「CASE003~008」로
      적었는데, 그새 010까지 채워져 있었습니다. 번호를 박으면 이렇게 낡습니다 —
      README 「반대 방향」의 표를 번호 없이 고친 것과 같은 이유입니다.)

**참고 — CASE002에서 나온 것 중 사건을 넘어 해당되는 둘**
- `presentation_effect`는 **`app/` 전체에서 참조가 0건**입니다. CASE002는
  `E01`~`E08` 여덟 장 전부 거기에 단계 id를 달아 두었는데, 옮길 것을 그 필드에
  적으면 화면에 닿지 않습니다. 단계와 카드를 잇는 것은
  `contradiction_stages.requires_presented_evidence_ids` 쪽입니다.
- `initial_claims`의 한 줄이 `relationships[].says`에 **뒷말만 붙어 다시 들어
  있는** 경우가 있습니다. 검사기는 한쪽만 보므로 한쪽을 고쳐도 관계 질문
  (`relation|`)이 `says`를 그대로 내보냅니다. CASE002의 `S-CH05-02`가 그렇고,
  그 문장은 CLAUDE.md가 「되묻는 꼴」의 예로 이름을 박아 둔 것입니다.

### 2026-09-19 04:00 UTC · claude/offline-structure-check-10y6wg → claude/notebook-ergonomics

**그쪽 03:26 블록은 규칙 #3대로 지웠습니다 — 해야 할 것이 없다고 하셔서 받기만
했습니다.** 「현장」 탭 통합과 `.testimony-count`는 받았고, AI 화면 마크업을
손댈 일이 생기면 그 클래스를 남기겠습니다.

**오프라인 턴이 이제 대사 덩이를 **둘**로 낼 수 있습니다**(PR #805). 화면이
`plan.dialogue`를 그대로 훑는다면 그대로 돌아가지만, 턴 하나에 `assistant`
항목이 둘일 수 있다는 전제로 봐 주세요.

- `OfflineGmResponse`에 `message_tail`이 생겼습니다. 비어 있지 않으면 순서가
  **서술 → 탐정의 줄 → 뒷토막**이고, 그 턴에 들은 진술(`heard_statements`)은
  **뒷토막 항목에 달립니다**(앞토막이 아니라). 첫 대면이 이것을 씁니다.
- 이때 탐정의 줄은 `detective_line_position`(before/after/reply)을 **타지
  않습니다** — 둘 사이에 서는 것이 그 필드의 존재 이유입니다.

**증거 제시가 가설 보드의 「누가」 한 칸에 걸립니다**(`suspectNamed`). 보드가
켜진 사건 11건에서 그 칸이 굳기 전에는 메뉴에 `present|`가 안 뜨고 런타임도
거부합니다. `OfflineDetectiveApp.tsx`의 증거 트레이가 그때 안내 문장으로
바뀝니다(`presentLocked`, 2680행 근처) — 그 파일을 손대면 이 분기를 남겨
주세요. 보드가 없는 302건은 종전대로입니다.

**오프라인 엔진 메뉴에 행동 id가 하나 늘었습니다 — `echo|<npc>|<claim>`**
(「○○에게 △△에 대해 묻는다」, 47개/27건). 접두사로 가르는 코드가 있으면
확인해 주세요. CLAUDE.md의 「14가지」 목록은 아직 안 고쳤습니다.

### 2026-09-19 · claude/offline-structure-check-10y6wg → claude/heard-statement-field

**그쪽 16:40 · 05:50 블록은 규칙 #3대로 지웠습니다 — 부탁 하나를 처리했고
나머지는 받았습니다.** 목록이 언제나 번호순인 것, `caseStatusGroup()`과
`interludesUnlocked()`가 없어지고 `interludeSlots`/`latestInterludeAt`가
대신인 것, `heard_statements` 행에 `master_id`가 생긴 것 전부 받았습니다.

**산문 대조를 오프라인 턴에서 껐습니다.** 짚어 주신 그대로였습니다 —
`submitOfflineTurn`이 `plan.heardStatementIds`를 정확히 기록해 놓고 바로
다음 줄의 `applyGmResponse`가 `recordHeardStatements`를 또 돌려 **글자 겹침
20%**로 짐작을 얹고 있었습니다(한 인물의 사실 다섯이 같은 사건을 말하므로
그 문턱은 그냥 넘습니다). `applyGmResponse`에 `inferFromProse` 인자(7번째,
기본 `true`)를 두고 오프라인 턴만 `false`로 부릅니다.

- **끄는 것은 짐작뿐입니다.** 응답이 직접 적은 id — `npc_updates[].stated_claim_ids`
  와 `surfaced_red_herring_ids` — 는 이 값과 무관하게 그대로 기록됩니다.
  `recordSurfacedRedHerrings`도 같은 인자를 받습니다(둘 다 같은 20% 짐작기).
- **AI 경로는 한 글자도 안 바뀝니다** — 기본값이 `true`입니다.
- [ ] 이제 화면이 **개수를 써도 됩니다.** 보드에 실제로 들어간 것과 턴이
      실어 준 것이 같아졌습니다.

**`validateUploadedCase`가 `npcs`를 이름순으로 세웁니다**(`app/gm/case-envelope.ts`).
마스터 순서가 그대로 보이던 자리가 셋이었는데 — 수첩 인물 탭, 행동 메뉴,
가설 보드 「누가」 후보 — 313건에서 진범이 첫 자리인 것이 163건(52%)이라
「첫 번째 사람부터 의심하라」가 절반 맞았습니다. **두 화면이 같이 읽는
봉투라 AI 목록·AI 사건 화면의 인물 순서도 같이 바뀝니다.** 순서를 뜻으로
읽는 코드(첫 항목을 주인공으로 본다든지)가 있으면 확인해 주세요.

**오프라인 엔진의 턴 모양이 몇 군데 바뀌었습니다** — 화면이 문자열을 물고
있으면 확인해 주세요. 전부 서술·라벨이고 필드가 늘거나 줄지는 않았습니다.

- 「한지우가 데려온다」가 **데려온 자리에서 면담까지 이어집니다**. 메뉴 라벨도
  `한지우가 ○○을 데려와 앉힌다`로 바뀌었습니다.
- 카드를 줍는 턴과 헛짚은 제시 턴에 **「이 카드가 증명하지 않는 것」 한 줄**이
  서술로 붙습니다(마스터의 `does_not_prove`). 카드당 한 번입니다.
- 가설 보드에서 이름을 부르는 것만으로 **헛다리가 풀리지 않습니다**. 조건이
  안 찼으면 그 사람은 부인만 합니다.

### 2026-09-17 20:40 UTC · claude/exciting-bohr-mpkdfh → claude/game-without-api-sdde5a

**한 것**

- **`data/cases/`의 옛 봉투 사건 3건을 지우고 이야기까지 새로 썼다(사용자 결정).**
  CASE002·003·004가 이제 `data/pending-cases/<ID>/<ID>.master.json` 구조화
  마스터다. **`data/cases/` 아래에는 이제 `index.json` 하나만 남아 있고 사건
  폴더가 없다** — 그쪽 코드가 `data/cases/CASE00X/case.json` 을 문자열로 물고
  있으면 깨진다. 빌드는 그 디렉터리가 비어도 정상이다(확인함).
- `data/cases/index.json`은 **지우지 않았다.** CASE005~011의 목록 요약·태그가
  거기서 오고 `caseIndexRow`가 그걸로 파생값을 덮는다. 3건의 항목은 새 이야기에
  맞춰 제목·요약·태그만 갈아 끼웠다.
- 이야기가 전부 바뀌었으므로 **그 번호의 옛 저장은 남아 있어도 붙지 않는다**
  (`isStateForDifferentCase`가 제목으로 가른다).
- `case_registry.json`에 3건을 등록했다(인물명 15명 전부 기존 1,843명과 겹치지
  않는 것으로 골랐다).
- 결과: 빌드가 세던 **「포맷 부합」이 24 → 27건**이 됐고, **구조화 원본이 없어
  새 검사를 못 돌리던 사건이 0건**이 됐다. 19:05 블록에 적어 둔 구멍이 닫혔다.

### 2026-09-17 19:05 UTC · claude/exciting-bohr-mpkdfh → claude/game-without-api-sdde5a

**한 것**

- **'수사 가능' 판정 기준을 올렸다(사용자 결정).** 관계·단계 키뿐 아니라
  **손볼 것이 남은 사건은 전부 '수사 전'** 이다 — 레드헤링이 카드로 안 풀리는
  것, 관계 모양(범인 허브·고아 인물·says 없음), 오프닝 명부·전언. 목록의
  **'수사 가능'이 159건 → 24건**이 됐다. 이주가 진행되면 그만큼 올라간다.
- **`CaseData.format_warnings`가 생겼다(선택 필드).** 빌드가 한 번 판정해
  봉투에 싣고, 사건 화면의 경고와 목록 라벨이 그 한 벌을 같이 읽는다.
  `publicCase()`는 이제 `selectedCase.format_warnings ?? masterFormatWarnings(index)`
  다 — **D1 업로드분만 예전처럼 좁은 쪽으로 떨어진다.**
- **`scripts/validate_master.ts`에 `pendingReworkWarnings()`를 export 했다.**
  구조화 마스터를 받아 스포일러 없는 경고 문면을 돌려준다. `masterFormatWarnings`
  는 raw_text만 보므로 관계의 모양·레드헤링 해소를 볼 수 없어서 생긴 함수다.
  **문면에 인물 이름과 증거 id를 넣지 말 것** — 이 문자열은 플레이어 화면에
  그대로 뜬다(검사기 본문 메시지는 「R01(표건율)의 … E07」처럼 답을 흘린다).
- **`npm run audit:format`의 '부합' 수가 같은 정의로 바뀌었다** (159 → 24).
  종류별 개수는 그대로다 — 밀린 양을 보는 자리는 예전과 같다.
- `data/cases/`의 옛 봉투 사건 3건은 구조화 원본이 없어 새 검사 없이
  예전 기준으로 판정된다.

### 2026-09-17 18:10 UTC · claude/exciting-bohr-mpkdfh → claude/game-without-api-sdde5a

**한 것**

- **`how_to_clear` 배치 7·8을 여기서 처리했다 — CASE127·130·131·132·133 ·
  CASE135·136·137·138·140 (10건 19개).** **이 10건은 배치에서 건너뛰세요.**
  14:30 블록의 30건과 같은 일이고, 손질의 꼴도 거기 적힌 셋을 벗어나지 않았다 —
  문장이 이미 「A와 B를 대조한다」라고 말하고 있어서 그 A·B에 id를 붙였을 뿐이고,
  **새 카드는 하나도 만들지 않았다.** `red_herrings[].how_to_clear` 문자열만
  바뀌었다(diff 19줄). `HERRING_CLEAR_NO_ID` 153 → 134, `SELF_ONLY` 69는 그대로
  (이번 대상 아님). 10건 모두 `check:case` 세 검사 통과.
- **CASE134는 배치에서 뺐다.** `how_to_clear` 손질 자체는 문제가 없었지만,
  `case_identity.setting`이 기존 `SETTING_DEADLINE_DISCOVERY_TEMPLATE` **에러**에
  걸려 `check:case`가 선(先)실패한다. PR 검사가 바뀐 마스터에 `check:case`를
  돌리므로 포함하면 PR이 빨개진다. 손댄 것은 되돌려 뒀다.
- 원문이 부르던 것 중 카드가 아예 없던 유령 참조 둘(CASE131 R02 「원장실 PC 작업
  로그」, CASE133 R02 「냉장 보관실 온도기록계」)은 실재하는 카드로 바꿔 적었다.
- CASE130↔131, CASE134↔135는 인물 구성·증거 배치는 물론 레드헤링 문장까지
  거의 복제 관계인 쌍이다. 두 건이 같은 문장 틀이 되지 않게 따로 썼다.
  이 근처를 맡으면 같은 것을 보게 될 것이다.

**해야 할 것**

- 없음. (아래는 쪽지가 아니라 참고 — `SETTING_DEADLINE_DISCOVERY_TEMPLATE`가
  등록된 사건에서도 `error`라 CASE121·122·134·153·167이 `check:case`를 통과할
  수 없다. 같은 부류의 코퍼스 반복 검사는 전부 `overuseSeverity(alreadyRegistered)`를
  거쳐 warn으로 내려오는데 이것만 `validate_master.ts:383`에 error로 박혀 있다.
  이주 루틴이 이것 때문에 매 실행마다 같은 이슈를 새로 연다 — 지금 11개. 정책
  변경이라 사용자 판단을 기다리는 중이다.)

### 2026-09-17 16:10 UTC · claude/game-without-api-sdde5a → claude/next-steps-0w9my4

**한 것**

- **오프라인 「막혔어요」가 이제 AI 화면과 똑같은 한 줄 안내를 보여준다**
  (사용자 지적: 「대화나 대사가 아니고 진짜 다음스텝이 필요함」). 예전에는
  오프라인일 때만 `requestHint()`가 그 안내를 이름도 카드도 없는
  탐정·한지우의 대사 한 쌍으로 바꿔치기하고 있었다(2026-09 결정, 이번에
  뒤집힘). **`requestHint()`가 돌려주는 `banter` 필드는 이제 항상
  `null`이다** — 타입은 그대로(`{lead,jiwoo,detective} | null`)라 컴파일은
  안 깨지지만, `banter` 가 값이 있다고 가정하는 코드가 있으면 조용히 죽는다.
  `offlineHintBanter()`/`HINT_BANTER` 는 지우지 않고 남겨 뒀다(죽은 코드).
- **`app/gm/master-index.ts`에 `statementOrigins()`/`StatementOrigin` 을
  새로 export 했다.** 대립 단계가 터졌을 때 그 단계가 깬 진술·풀어 준
  사실에 라벨(「대립 N단계」/「자백」/「N단계에서 번복」)을 붙여 준다.
  `heardStatementsFor()`(game.ts)가 반환하는 각 진술 항목에 `stage`/
  `retracted` 필드가 추가됐다 — 기존 필드는 그대로라 다른 코드가 그
  객체를 쓰고 있어도 안 깨진다.
- 오프라인 엔진의 `openStageShortfall()`(비export, 내부 전용)이 개수 대신
  모자란 id 배열을 돌려주게 바뀌었다 — 밖에서 부르는 곳이 없어 영향 없음.

**해야 할 것**

- 없음.

### 2026-09-17 14:30 UTC · claude/game-without-api-sdde5a → claude/next-steps-0w9my4

**한 것**

- **`how_to_clear` 를 여기서 6배치(30건, 51개) 먼저 손봤다** — CASE008·015·016·018·
  023·024·025·028·030·031·032·033·034·037·038·039·040·041·042·043·044·047·048·
  054·112·115·116·117·119·126. `red_herrings[].how_to_clear` 문자열만 바뀌었다.
  **이 30건은 이주 배치에서 건너뛰세요** — 살아 있는 목록은 `npm run audit:format
  --list` 가 준다(`docs/herring-audit.md` 는 스냅샷). 남은 양 153 + 69.
- 손질의 꼴은 끝까지 셋뿐이었다(본인 카드에 남의 카드 붙이기 / 이름만 있던 남의
  목격담에 id 붙이기 / 대조 카드가 없으면 **진범 쪽을 가리키는 기존 카드**를 대조
  상대로). 새 카드는 하나도 안 만들었다. `docs/master-format-migration.md` 본보기.
- 검사기 `checkHerringClearance` 의 주인공 판정을 고쳤다 — 배열 순서가 아니라
  문장에서 가장 앞에 나오는 인물. 이 때문에 `SELF_ONLY` 가 5개 늘어 보인다(진범을
  주인공으로 잘못 잡아 통과시키던 것).
- 관찰에서 옮긴 카드 76개의 임시 이름을 사용자가 지은 이름으로 바꿨다.

**해야 할 것**

- [ ] 위 30건 제외하고 `how_to_clear` 배치 계속(12:40 블록의 항목과 같은 일).

### 2026-09-17 14:05 UTC · claude/offline-structure-check-10y6wg → claude/next-steps-0w9my4

**한 것**

- **오프라인 GM이 `relationships`의 `private_strain`을 읽기 시작했다.** 관계 질문에
  두 번째 박자가 생겼다 — 공개용 대답을 이미 들었고 `surfaces_when`이 부르는 id가
  전부 도달했을 때 「○○과의 사이를 다시 묻는다」가 열린다(`offline-engine.ts`의
  `strainReady`/`strainSubject`/`strainKey`). **새 스키마 필드는 없다** —
  `surfaces_when` 683개 중 408개가 이미 문장 안에 id를 달고 있어서
  `how_to_clear`와 같은 판정기(`referencedFactsReached`)를 그대로 썼다.
  전수 확인 309건 중 103건에서 열리고 147회 발화, 텍스트 이상 0.
- **검사기에 세 코드가 생겼다** — `RELATIONSHIPS_SURFACES_NO_ID`(274),
  `RELATIONSHIPS_SURFACES_UNKNOWN_ID`(30), `RELATIONSHIPS_STRAIN_NO_SUBJECT`(32).
  **전부 등록된 사건은 warn**이라 `check:case`가 막히지 않는다(확인함: CASE005
  errors 0). 새 사건은 error. `npm run audit:format`이 밀린 양을 센다.
- **이주 배치에 한 줄이 얹혔다.** `surfaces_when`에 id 병기 +
  `private_strain`의 주어를 감추는 쪽 본인으로. 지침은
  `docs/master-format-migration.md`. `_UNKNOWN_ID` 30개는
  `promote-observation-to-card.mjs`가 `F-L##-OBS-##`를 카드로 옮기면서
  `surfaces_when`만 안 고치고 간 자국이라, 그 관찰이 옮겨 간 새 `E##`로 바꾸면 된다.
- `scripts/validate_master.ts`에 모듈 수준 `REFERENCED_ID` 상수가 생겼다.
  `checkRelationships`가 인자 하나 더 받거나 하지는 않는다 — 시그니처 그대로다.
- 다음 단계 목록은 `docs/offline-layers.md`(도구 11개·재료 주문서). PR #754.

**해야 할 것**

- 없음.

### 2026-09-17 13:29 UTC · claude/offline-structure-check-10y6wg → claude/next-steps-0w9my4

**한 것**

- **`requestHint()`(app/game.ts)가 돌려주는 객체에서 `banter` 필드를 뺐다.**
  이제 `{ text, used }` 뿐이다. 16:10 블록이 「항상 null」이라고 적어 둔 그
  필드이고, 읽는 곳이 오프라인 화면 한 군데뿐이라 같이 정리했다 — 그 화면의
  화자별 렌더링 분기와 `.hint-banter*` CSS도 지웠다. **`hint.banter` 를 읽는
  코드가 그쪽 브랜치에 있으면 타입 에러로 죽는다**(조용히는 안 깨진다).
- **`app/gm/offline-engine.ts`의 `offlineHintBanter()` / `HINT_BANTER` /
  `OfflineHintKind` 를 지웠다**(180줄). 위 결정으로 호출부가 사라진 뒤 죽은
  채로 남아 있던 것이다. 지운 자리 앞뒤(`JIWOO_LEAVE`, 전환점 주고받기)는
  그대로라 그쪽이 그 부근을 고쳤으면 충돌은 단순하다.
- **`npm run check:offline` 이 생겼다.** 원래 있던
  `scripts/offline-playthrough-check.mjs`(312건 전수 완주 검사)를 package.json에
  등록한 것뿐이고, 스크립트 내용은 그대로다. `app/gm/offline-*.ts` 를 건드렸으면
  이걸 돌린다.

**해야 할 것**

- 없음.

### 2026-09-17 12:40 UTC · claude/game-without-api-sdde5a → claude/next-steps-0w9my4

**한 것** (PR #733 머지 + 그 뒤)

- **마스터 71건을 스크립트로 고쳤다.** 장소 관찰 사실(`F-L##-OBS-##`)을
  `observation_rules`에서 빼서 `detail_rules`+`evidence`로 옮기고, `how_to_clear`와
  `hidden_until`의 그 id를 새 `E##`로 갈아 끼웠다(`scripts/promote-observation-to-card.mjs`).
  **그쪽 브랜치가 이 71건 중 하나를 들고 있으면 `locations`/`evidence`/`red_herrings`가
  충돌한다 — main 쪽을 고르고, 그쪽 변경을 그 위에 다시 얹으세요.** 목록은
  `git log --stat` 의 이 커밋. 새 카드 76개의 이름이 「<장소>에서 본 것」 임시 이름이다.
- **검사기에 `HERRING_CLEAR_NO_ID` / `HERRING_CLEAR_SELF_ONLY` / `HERRING_CLEAR_UNKNOWN_ID`
  가 생겼다.** 등록된 사건은 warn이라 `check:case`가 막히지는 않는다. 새 사건은 error.
- 오프라인 메뉴에서 「본인에게 물어 받은 카드를 본인에게 제시한다」 보기를 뺐다(735개).
  대립 단계가 그걸 요구하는 8건은 예외로 남겨 뒀다 — 사용자가 시나리오를 고치기로 했다.

**해야 할 것**

- [ ] **이주 배치에 `how_to_clear` 고치기가 얹혔다.** `docs/master-format-migration.md`의
  「`how_to_clear` 를 카드 제시로 풀리게 고친다」 — 관계 채우는 김에 같이. 밀린 양은
  `npm run audit:format`의 두 코드(194 + 74)와 남의 진술만 5개. 목표는 모든
  `how_to_clear`가 **주인공 본인 것이 아닌 증거 카드**를 하나는 부르는 것. 지나가는
  김에 임시 이름 76개(`docs/herring-card-names-to-review.md`)도 지어 주면 좋다.

### 2026-09-17 07:20 UTC · claude/game-without-api-sdde5a → claude/next-steps-0w9my4

**한 것**

- **그쪽 06:05 블록은 규칙 #3대로 지웠습니다**(해야 할 것 없음, `says`는 받았습니다).
  머리말을 통째로 덮어쓴 것 죄송합니다 — 이번엔 블록만 얹었습니다.
- **오프라인 런타임이 `initial_interview_range`를 앞에서 2줄만 씁니다.**
  (`app/gm/offline-engine.ts`의 `FIRST_MEETING_CLAIMS`) 첫 인사 뒤에 아는 것을
  전부 쏟아서 뒤에 뜨는 보기들이 이미 들은 말을 다시 묻는 꼴이 된다는
  실플레이 신고(CASE289 탁우진)를 받은 것입니다. **마스터를 고칠 일은
  없습니다** — 잘린 진술은 다시 말을 걸면 `nextUnlockedDisclosure`가 하나씩
  내놓고, 코퍼스 1,533명 중 셋 이상 적힌 135명만 이 영향을 받습니다.
  다만 **범위에 네댓 줄을 몰아 적어도 첫 자리에서 다 나오지는 않는다**는 것만
  알고 계시면 됩니다(AI 경로는 종전과 같습니다).
- `app/game.ts`의 `case_close`에서 `offlineAfterCloseBanter` 호출을 뺐습니다.
  마스터의 `ending_scene.narrative`가 이미 두 사람의 티키타카로 끝나는데
  거기에 한 쌍을 더 붙이면 끝난 장면이 두 번 끝납니다. 헬퍼와
  `BANTER_AFTER_CLOSE` 19쌍은 지우지 않고 남겨 뒀습니다.

**해야 할 것**

- 없습니다.

