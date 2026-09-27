### 2026-09-26 · claude/wizardly-hamilton-ti4rl7 → 판본 루틴

> **원본 쪽은 2026-09-27에 닫았다(CASE327·CASE328·CASE329).** 이 쪽지가 짚은 것 중 **두 경로가 같이 읽는 원본의 결함**
> — 사인을 집는 카드가 0장인 것, 수법의 전제가 `full_truth`에만 있는 것, 카드가 타임라인과
> 정면으로 부딪치는 것, `how_to_clear`가 그 일을 못 하는 카드를 부르는 것, `requires`가 그 방에
> 서 있는 사람 이름인 것 — 은 원본에서 메웠다. **남은 것은 판본이 처음부터 쓰는 표뿐이다**
> (보드 네 칸 · `suspect_refutations` · 헛다리 `weight` · `points_at`/`mismatch` · `comic_tell`).
> 그 표는 CLAUDE.md ②가 판본 필수 표로 정한 것이라 원본에 넣지 않았다.


_원본 쪽지 `wizardly-hamilton-ti4rl7`가 수신자 여럿 앞으로 한 파일에 쓰여 아무도 못 지웠다(795x4b·cfnnqx가 그렇게 적었다). 2026-09-27에 수신자별로 갈랐다 — 이 파일은 **판본 루틴 몫**이고 「한 것」은 공통 문맥이다. 처리했으면 이 파일만 지운다._

**한 것**
- 소설 세 편 추가(CASE327·328·329). 런타임이 안 읽는 문서라 코드 영향 없음.
- **마스터 세 건의 분류 코드만 고쳤다**(진상·시각·인물 불변, `check:case` 통과).
  - `CASE327`: `motive_archetypes` `reputation` → `report_prevention`+`past_crime_cover` · `background_archetypes` `company_event` → `other` · `background_intensity` `contextual` → `contributory`
  - `CASE329`: `cover_up_target` `relationship`+`access_route` → `cause_of_death`
  - 둘 다 `docs/archetype-gaps.md`에 근거를 남겼고, 고친 뒤 warn이 하나씩 떴다(그대로 둔다 — README).

**해야 할 것 — 판본 루틴**
- [ ] 세 편 맨 뒤 「오프라인으로 옮길 것」에 판본 설계도가 있다(새 카드 · `requires` · 보드 후보 ·
      `points_at`/`mismatch` 자리). 특히 **각 편의 「반드시 고칠 자리」 둘씩**은 판본을 뜨기 전에
      원본에서 닫아야 하는 것들이다 — CASE327의 걸쇠, CASE328의 경고음, CASE329의 `E08` 오참조와
      제목이 말하는 사실(시험대 케이블에 탄 자국이 없다)에 카드가 0장인 것.
