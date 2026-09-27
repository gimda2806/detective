### 2026-09-26 · claude/fervent-bohr-hn79xs → (다음 생성 루틴 세션)

**한 것**

- **CASE336 「종달새가 울지 않은 밤」 추가.** 처음 배정받은 번호는 CASE335였다 —
  registry 최댓값(CASE334) + 1이고, 착수 시점에 열려 있던 PR 넷(#1349·#1351·#1352가
  CASE332, #1354가 CASE333)이 335를 건드리지 않아 안전하다고 판단했다. 그런데 커밋
  직전에 재확인하니 **PR #1358이 이미 CASE335 「국자를 내려놓은 자리」로 열려 있었다**
  — 같은 회차 어딘가에서 다른 세션이 동시에 335를 잡은 것이다. 마스터·소스·레지스트리
  세 파일을 폴더째 `CASE336`으로 옮기고 `case_id` 필드만 고쳐 재배정했다(내부 id는
  CH##/L##/E## 뿐이라 사건 번호에 안 물려 있다). **커밋 직전·푸시 직전 두 번 다
  `list_pull_requests`로 재확인하는 절차가 실제로 충돌을 잡았다** — 이 순서를 건너뛰지
  말 것.
- 무대: `museum_exhibition` + `restricted_site`(자동인형·시계 복원 박물관). 소규모
  사업·상점 계열(`small_trade`, repair_shop/specialty_shop 등)이 가족 임계
  22.3%로 이미 넘어 있어 **그 일곱 칸 전부를 피했다** — `npm run check:case`를 돌리기
  전에 `data/pending-cases/*/*.master.json`을 직접 세어 계열·칸 임계를 미리 계산해
  둔 덕에 재작업이 없었다.
- 동기 `financial_gain`+`reputation`, 수법 `machine_entrapment`(자동인형 기어 얽힘사),
  은폐 `object_substitution`+`document_falsification` — 전부 코퍼스 8%/5% 미만.
  `detective_entry_type`은 `event_attendance`(최근 3건 `onsite_recognized_and_asked`·
  `professional_consultant`·`returning_former_affiliate`와 안 겹침).
- 오류 라운드: 1차 `check:case`에서 error 3(COVER_UP_DECLARATION_NARROW — `cover_up`
  문장의 "헐거"가 `accident_equipment_failure` 폴백에 걸림 / HERRING_CLEAR_SHARES_STAGE_CARDS
  — R02 해소 카드 둘이 전부 C03 요구 카드와 겹침 / BACKGROUND_INTENSITY_UNSUPPORTED —
  `exhibition` 계열 키워드가 `full_truth`에 한 번도 안 울림), warn 6(고립 카드).
  전부 필드 단위로 고쳐 2차에 errors 0·warnings 0. 은폐 문장은 낱말만 바꿨고(뜻은
  그대로), 헛다리는 카드 한 장(E17, 전다림의 증언)을 새로 만들어 대립 단계와 안
  겹치게 했고, 배경은 `method` 문장에 "특별전" 한 낱말만 보탰다.
- `npm run check:case CASE336` — errors 0, warnings 0. `npx tsc --noEmit` 통과.
  `npm run lint:baseline` — 기존 기준선 49건 그대로(신규 lint 오류 없음).
  `npm run build:source CASE336` 실행.
- `data/case_registry.json`에 CASE336 항목 추가(인물 5명·피해자 1명·entry_type·
  genre/setting/death_method).

**해야 할 것 — 사용자**

- (없음)

**해야 할 것 — 다음 생성 루틴 세션**

- **머지는 사람이 한다 (자동 머지가 이 세션에서 거부됨).** PR #(아래 참고)이 열려
  있고 CI가 통과했더라도, 이 세션은 병합 권한이 없다 — 사람이 리뷰 후 머지할 것.
- 이 회차에 CASE335를 다른 세션이 이미 썼으니(#1358), **다음 세션은 registry
  최댓값을 다시 셀 때 이 PR이 머지됐는지부터 확인**할 것 — 머지 전이면 335도 336도
  둘 다 열려 있는 상태로 보일 수 있다.
- CASE336에는 오프라인 판본(`Case-No-336.offline.json`)이 없다 — 필요하면
  `docs/offline-version-routine.md`의 절차를 따를 것(이 세션의 범위 밖).
- `pressure_responses`의 "제가 왜 그런 짓을 하겠습니까/했겠습니까" 계열이 코퍼스
  최다(16건 안팎, 2026-09-26 `wizardly-hamilton-9id31j` 노트 참고)인 것을 이 세션도
  초안에서 그대로 썼다가 뒤늦게 알아채고 고쳤다 — **새 사건을 쓸 때 이 문구를 첫
  pressure_response 후보에서 아예 빼는 것**이 다음 세션들에 유효할 것 같다.
