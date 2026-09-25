### 2026-09-26 · claude/wizardly-hamilton-o1mcaq → 전체(생성 루틴에 한 건)

**한 것**

- 소설화 **번호순 회차 — CASE323 한 편**([docs/novels/CASE323.md](../novels/CASE323.md),
  「첫배를 기다리는 밤」). `docs/novels/README.md`의 표 한 행 · 번호순 「다음 차례」 줄 · 회차 절을
  갱신했고 **줍기 포인터와 판본 대조 갈래의 포인터는 건드리지 않았다.**
- **`data/pending-cases/CASE323/CASE323.master.json`을 고쳤다 — 분류 코드 세 축만.** 진상·시각·인물·
  대사는 한 글자도 안 건드렸다. **이 파일을 같이 보고 있는 세션이 있으면 이 세 줄만 충돌한다.**
  - `full_truth.cover_up_method`: `other` → `false_accident` · `digital_record_manipulation` · `evidence_placement`
  - `full_truth.cover_up_target`: `access_route` → `access_route` · `victim_behavior`
  - `full_truth.method_archetypes`: `hypothermia` → `hypothermia` · `delayed_rescue`
  근거는 전부 `full_truth` 산문의 낱말이고 표로 `docs/archetype-gaps.md`의 **「소설 루틴 검산
  (CASE323)」** 절에 적었다. `check:case CASE323`은 고치기 전 **0 · 0**, 고친 뒤 **errors 0 · warnings 5**
  (다섯 다 비율 보고). `check:offline CASE323` 완주 가능 1·불가 0. `check:novel` 코퍼스 총계 **360 그대로**.
- `docs/archetype-gaps.md`에 두 절을 더했다 — 위 검산 표, 그리고 **정규식 목록에 없던 낱말 넷**
  (`delayed_rescue`의 「부러」 · `evidence_placement`의 「밀어 넣」 · `victim_behavior`의 「먼저 떠나」 ·
  `hypothermia`의 「냉동창고」). **정규식은 고치지 않았다 — 검사기를 고치는 것은 이 루틴의 일이 아니다.**

**해야 할 것**

- **(생성 루틴)** `docs/handoff/2026-09-26-keen-newton-0e5ajk.md`가 남긴 「CASE323의 `cover_up_method`도
  `other`를 썼지만 근거는 다르다(칸이 없어서다)」는 **반만 맞다는 것을 확인했다.** 그 판단은 「피해자가
  살아서 스스로 떠났다」는 손놀림 하나에 대해서는 맞지만, 같은 문단이 부르는 **사고 위장**(「고장 난
  문에 갇힌 사람으로 보이게」)과 **전산 기록 조작**(「통화 기록을 지우고 … 전원을 껐다」)은 칸이 있는데도
  선언되지 않았고, `evidence_placement`는 갭 문서가 직접 **문턱 때문에 뺐다**고 적어 두었다.
  **한 칸의 `other`가 가린 것이 셋이고 그중 하나만 「칸이 없어서」다.** 그 쪽지는 생성 루틴이 쓴 것이라
  지우지 않았다 — 위 세 축은 이 회차가 이미 되돌려 놓았으니 **다시 `other`로 내리지 말 것**(CLAUDE.md:
  「경고를 없애려고 칸을 내리지 않는다」). 새 사건에서 비율 검사가 error인 것 자체는 사용자 판단
  항목이고, 그 쪽지도 그대로 뒀다.
- 나머지는 알림이다.
- **세 갈래가 다시 전부 비었다.** 회차를 시작하면서 셋을 다 세었다.
  - 번호순/줍기: `for d in $(ls data/pending-cases/); do [ -f "docs/novels/$d.md" ] || echo $d; done`
    — 시작할 때 `CASE323` 하나, 이 편으로 **0**.
  - 판본 대조: `for f in data/pending-cases/*/Case-No-*.offline.json; do id=$(basename $(dirname $f)); grep -q "판본이 따로 더한 것" docs/novels/$id.md || echo $id; done`
    — **비어 있다**(판본 열셋 전부에 그 절이 붙어 있다).
  **다음 소설화 회차의 일감도 생성 루틴이 새 번호를 머지해 주어야 생긴다**(`next:case-id`는 CASE324).
  셋 다 비어 있으면 **없는 일을 만들어 쓰지 말 것.**
- **(오프라인 루틴)** CASE323 판본을 뜰 때 먼저 볼 자리 셋을 그 편의 「오프라인으로 옮길 것」에 적었다.
  ① `required_established_facts` 다섯 중 셋(`E05`·`E06`·`E15`)이 `presentation_effect`가 비어 **줍기만 하고
  못 내미는 카드**다(그중 둘은 `decisive_evidence_ids`) — CASE320·CASE322에 이어 **세 번호 연속**이고
  개수가 하나에서 셋으로 늘었다. ② 위장을 깨는 값 둘(`F-L03-OBS-01` 신호 차단 · `F-L04-OBS-01` 얼어붙은
  계류줄)이 **둘 다 관찰 사실이라 제시할 수 없고**, 앞엣것은 `final_deduction.key_connection`이 첫 마디로
  부르는 값이다. ③ 「잠금」·「비밀번호」·「패턴」이 마스터 전문에 **0회** — 진범이 피해자의 휴대전화로
  문자를 보내고 기록을 지우는데 **그 화면이 어떻게 열렸는지가 데이터에 없다.**
- **CASE319~CASE322에서 세 번 연속 보고됐던 「진범만 `hidden_until`이 비어 있다」가 CASE323에서
  끊긴다.** 다섯 인물 전부 `hidden_until`을 갖고, `CH02`의 `F-CH02-01`은 `C03`으로 잠긴다. 생성 쪽 틀이
  바뀐 자리일 수 있어 적어 둔다(진범의 `knows`가 빈 문제도 이 편에는 없다 — 1건 있다).
