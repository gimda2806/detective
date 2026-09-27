### 2026-09-27 · claude/fervent-bohr-7qaij3 → (다음 생성 루틴 세션)

**한 것**

- CASE344 「의견서가 나오기 전」 생성·검증·레지스트리 등록·PR #1377 머지 완료(CI 통과 후 병합).
- **번호 경합이 이번 회차에 특히 심했다** — 시작 시점 `next:case-id`는 CASE339였고 그
  자리에 다 써서 검증까지 통과시켰는데, 커밋 직전 `git fetch` 재확인에서 main에
  CASE339·CASE340이 이미 다른 세션들이 병합해 둔 상태를 발견했다. CASE341로 옮겨
  다시 검증했는데, 이번엔 **열린 PR**(#1349)이 몇 분 사이 341을 자칭하는 것을 발견해
  CASE342로, 그 직후 다시 확인하니 #1351이 342를, #1359가 343을 각각 자칭하고
  있어서 최종적으로 **CASE344**로 정착했다. 세 번 다 파일명·`case_id`·registry 키만
  바꾸고 사건 내용(인물·트릭·증거)은 처음 설계 그대로 옮겼다. **결론: 이 시간대에
  동시 세션이 최소 3~4개 CASE33x~34x 번호를 두고 움직이고 있었다** — 이후 세션은
  머지 직전에 `git fetch` + `mcp__github__list_pull_requests`(open, 전체)를 한 번
  더 보고 스스로도 경합에 들어갈 각오를 할 것.
- 무대 `court_legal_facility`(가정법원 부속 조정센터, 코퍼스 338건 중 0.9%) · 진입
  경로 `legal_or_official_obligation`(최근 3건과 안 겹침) · 동기
  `custody`/`control`/`obsession`(코퍼스 8% 축 다 피함) · 수법 `stabbing`(4.7%).
- **사인을 처음부터 숨기지 않는 설계를 택했다.** 실측해 보니(`data/case_registry.json`
  + 전체 `pending-cases/*/*.master.json`을 직접 스캔하는 스크립트, 코퍼스 338건
  기준) `cover_up_target: cause_of_death`가 이미 132/338(39%)건, 칸당 기대치의
  **2.9배**라 새 사건이 이 칸을 쓰면 사실상 자동으로 error다(`concentrationIssues`
  2배 문턱). 그래서 사인(자상)은 공개 정보로 두고, `weapon`/`access_route`/
  `relationship` 세 칸으로 은폐를 설계해 배수를 전부 1.2배 밑으로 뒀다(경고 0).
  **다음 생성 세션도 `cause_of_death`를 cover_up_target에 넣지 말 것** — 넣는 순간
  다른 어떤 설계를 해도 이 축에서 걸린다.
- 알려진 반복 실패 패턴(사인을 짚는 물증 카드 0장) 회피: 목의 자상·방어흔을 검안
  소견으로 보여주는 카드(E06)를 대립 2단계의 요구 카드로 직접 썼다.
- `check:case CASE344` errors 0 · warnings 0. `check:offline -- CASE344` 완주 가능
  1/1. `tsc --noEmit` 클린. `lint:baseline` 기준선 49건 변동 없음.
- 이 환경도 `node_modules` 없이 시작해 `npm ci`를 먼저 돌렸다.
- 처리한 쪽지: 없음(자기 절·수신 쪽지 없음 — `docs/handoff-backlog.md` 확인, 자기
  이름으로 온 것 없었다).

**해야 할 것**

- 없다.
