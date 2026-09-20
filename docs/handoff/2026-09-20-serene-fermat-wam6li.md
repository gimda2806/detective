### 2026-09-20 02:10 UTC · claude/serene-fermat-wam6li → 소설화 루틴 · 이주 루틴

**한 것**

- **회차를 시작할 때 볼 것이 한 줄에서 셋으로 늘었다.** `docs/novels/README.md`와
  `CLAUDE.md` 두 곳이 「중복이 일어나는 자리는 README의 **「다음 차례」 한 줄**」이라고
  단정하고 있었는데, **그 뒤에 쪽지로 기록된 겹침 네 건 중 그 한 줄을 지목한 것이
  하나도 없다.** 당사자들이 적어 둔 진단을 모으면 이렇다:

  | 겹친 회차 | 버린 쪽 | 지목한 자리 |
  | --- | --- | --- |
  | CASE036~040 | `wizardly-hamilton-tldv59` | `docs/novels/`의 실제 파일 목록 |
  | CASE054·055·060~062 | `wizardly-hamilton-u7wtmr` | 상대가 이미 마스터를 고쳐 둠(PR #867) |
  | CASE020 | `wizardly-hamilton-hvmpv5` | `handoff.md`의 체크박스 |
  | CASE021~025 어휘 | `wizardly-hamilton-xwusr3` | `docs/handoff/`를 시작 전에 읽는가 |

  그래서 두 문서에 **① `git fetch` ② 실제 파일 목록 ③ `docs/handoff/` 남은 쪽지**
  순서를 적었다. 「PR을 머지까지 가져간다」는 지우지 않았다 — 여전히 필요하지만
  그것만으로는 충분하지 않다는 것이 네 건이 말하는 것이다.

- **문서만 바뀌었다.** 코드·스키마·마스터는 한 글자도 건드리지 않았고, 진행 중인
  회차가 충돌할 파일은 `docs/novels/README.md` 하나다(「다음 차례」 줄과 진행표는
  그대로 두었으므로 회차 끝에 그 줄만 고치면 된다).

**해야 할 것**

- [ ] 없다. 다음 회차를 시작할 때 위 셋을 순서대로 보면 된다.

---

### 2026-09-20 02:35 UTC · 같은 브랜치 · 규칙 #3 처리함

**받아서 지운 쪽지 13장** — 전부 「해야 할 것: 없음」이거나 그 항목이 이미 끝난
것이다. 규칙 #3대로 지우는 것이 「받았다」는 신호라 지웠고, 규칙 #4대로 여기
남긴다.

`2026-09-17` 0720·1329·1405·1610·1905·2040 · `2026-09-19` 0400 ·
1226-wizardly-hamilton-5akhfw · amazing-galileo-1itgnb-4 ·
determined-wright-anfsht · wizardly-hamilton-hvmpv5 · -xwusr3 · -z561y5

- **`0400`은 항목이 하나 있었는데 이미 끝나 있었다** — 「CLAUDE.md의 「14가지」
  목록은 아직 안 고쳤습니다」. 지금 CLAUDE.md는 **16가지**로 적혀 있다.
- **`determined-wright-anfsht`의 교훈만 문서로 옮기고 지웠다.** 「뼈대를 갈아
  끼울 때 `full_truth`만 고치면 절반」이 어느 문서에도 없어서, 같은 사실이
  흩어져 있는 다섯 자리와 옛 줄기 낱말 `grep` 방법을
  `docs/master-format-migration.md`에 절 하나로 적었다. 나머지 12장은 내용이
  이미 코드나 `docs/archetype-gaps.md`에 반영돼 있어 그대로 지웠다.

**일부러 남긴 것 둘** (해야 할 것 절은 비어 있지만 미해결이다)

- `2026-09-17-1810-exciting-bohr-mpkdfh.md` —
  **`SETTING_DEADLINE_DISCOVERY_TEMPLATE`가 등록된 사건에서도 `error`**라
  CASE121·122·134·153·167이 `check:case`를 통과할 수 없다. 같은 부류는 전부
  `overuseSeverity(alreadyRegistered)`로 warn이 되는데 이것만
  `validate_master.ts`에 error로 박혀 있고, 그 때문에 이주 루틴이 매 실행마다
  같은 이슈를 새로 연다. **정책이라 사용자 판단이 필요하다.**
- `2026-09-19-offline-structure-check-10y6wg.md` — 화면 쪽에 남은 항목이 하나
  열려 있다.
