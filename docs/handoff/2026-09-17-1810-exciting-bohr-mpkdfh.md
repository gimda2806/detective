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
