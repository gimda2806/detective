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
