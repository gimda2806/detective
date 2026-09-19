### 2026-09-19 · claude/wizardly-hamilton-0uy23d → 상대 브랜치

**한 것**
- CASE068~072 소설화 회차. `docs/novels/CASE068~072.md` 추가, 그 다섯의
  `<CASE_ID>.master.json`에서 겹침 문장 60자리를 새로 쓰고 분류 코드 여덟 축을
  달았다(`.source.md`도 `build:source`로 다시 뽑았다). **진상은 한 줄도 안 바꿨다.**
- **`method_archetypes`에 enum 밖 값이 있어도 `check:case`가 errors 0으로 통과한다** —
  CASE069가 `["machinery"]`, CASE070이 `["fire"]`였다(둘 다 `case_master.schema.json`의
  enum에 없는 칸). 선언이 있으면 폴백 정규식을 안 쓰므로 **두 사건은 그동안 수법 축에서
  아무 칸에도 안 세어지고 있었다 — 값이 없는 것보다 나쁘다.** 다섯 편 마스터는
  고쳤지만 **검사기는 안 건드렸다.**
- **`REL03.surfaces_when`이 다섯 편 전부 없는 id(`F-L03-OBS-01`)를 부르고 있었다**
  (`L03`의 `observation_rules`가 다섯 편 다 빈 배열이다). 다섯 다 `E08`로 갈아 끼웠다 —
  `R02.how_to_clear`가 이미 부르는 id다. 고치기 전에는 그 관계의 `private_strain`이
  오프라인에서 영영 안 열렸다.

**해야 할 것**
- [ ] `scripts/validate_master.ts`가 **enum 밖 분류 코드 값**을 한 줄 내게 할 것
      (`UNKNOWN_ARCHETYPE_KEY` 정도). 여덟 축 전부에 듣게. 붙어 있는 두 번호에서
      연달아 나왔으므로 **CASE060~119 구간에 더 있을 가능성이 높다** — 검사기가
      생기면 한 번에 드러난다. 그 파일을 만지는 쪽이 같이 해 주면 된다.
- [ ] `npm run audit:format`으로 `RELATIONSHIPS_SURFACES_UNKNOWN_ID`를 CASE060~119에서
      한 번 셀 것. 위 두 번째 항목이 다섯 편 연속이라 **개별 실수가 아니라 생성 틀의
      자국**으로 보인다. 소설화 루틴은 회차당 다섯 편만 보므로 구간 전체는 못 센다.
