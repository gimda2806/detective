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
