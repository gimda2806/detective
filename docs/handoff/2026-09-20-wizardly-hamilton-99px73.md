### 2026-09-20 · claude/wizardly-hamilton-99px73(소설화 루틴) → 소설화 루틴 · 이주 루틴 · 생성 루틴

**한 것 — CASE193~197 소설화 회차**

- `docs/novels/CASE193.md`~`CASE197.md` 다섯 편. `check:novel` errors 0,
  `check:case` 다섯 편 다 errors 0, `check:spelling` 0, `check:offline` 248/248,
  `tsc --noEmit` 0, `npm run build` 통과.
- **그 다섯의 `*.master.json`을 고쳤다.** 같은 파일을 이주 루틴이 잡으면 충돌한다.
  - **분류 코드 여덟**을 다섯 편 전부에 추가(`location_archetypes` ·
    `case_identity.background` 셋 · `full_truth`의 `method_archetypes` ·
    `motive_archetypes` · `cover_up_target` · `cover_up_method`).
    **다섯 편 다 여덟 칸이 통째로 비어 있었다** — 187~192 회차에 이어 둘째 회차
    연속이다. **193·194·195·196·197은 그 축이 이미 끝나 있다.**
  - **CASE193** — `F-CH04-02`의 「**1시** 40분경」 → 「**13시** 40분경」.
    `T03`·`S-CH04-01`·`E04`·`E09`가 전부 13:40이었다. 182~186·187~192 회차가
    `full_truth.key_time_location`과 증거 카드 `content`에서 찾아낸 12시간제
    자국인데, **이번에는 인물의 `knows`에서 나왔다.**
  - **CASE193·194·195·196의 `opening_scene.narrative`·`ending_scene.narrative`를
    다시 썼다.** 넷이 같은 세 박자를 공유하고 있었다(아래).
    **진상·사실은 한 줄도 바뀌지 않았다.**
- `npm run build:source`를 다섯 편 다 다시 돌렸다(`.source.md`에는 변화 없음 —
  그 문서는 분류 코드와 오프닝 산문을 담지 않는다).
- `docs/archetype-gaps.md`에 이 회차 절을 더했다(`other` 둘, 근거 낱말 열셋,
  확인한 것 둘).

**해야 할 것**

- [ ] **CASE210을 맡는 회차에게**: 193~196과 **같은 오프닝·엔딩 틀**을 쓰는 다섯째
      편이 CASE210이다. 「평소의 가벼운 말투는 조금도 섞여 있지 않았다」·「탐정은
      아무 말 없이 수첩을 덮었다」·「픽 웃음을 터뜨렸다가, 이내 다시 표정을
      굳혔다」가 193·194·195·196·**210** 다섯에만 있다. **이 회차는 210을 건드리지
      않았다**(그 사건을 읽는 회차가 그 사건 것만 고친다). 대조표는
      `docs/novels/CASE197.md` 맨 뒤 1번.
      **`audit:duplication`은 이 다섯을 못 잡는다** — 오프닝·엔딩은 사람 이름이
      박혀 있어 뼈대가 갈린다.
- [ ] **검사기를 보는 세션에게**: `BACKGROUND_INTENSITY_UNSUPPORTED`가 보는 방향의
      반대쪽이 비어 있다. 이 회차 다섯 중 **셋(193·194·197)이 배경을 `setting`에
      아예 안 적는다**(계약 서명 · 화보 촬영 · 감정 의뢰가 전부 `full_truth`와
      `actual_timeline`에만 있다). 폴백은 `setting`만 읽으므로 **선언이 없으면
      193은 「인터뷰 촬영」으로, 197은 아무것으로도 안 세어진다.** 그리고 그 검사는
      키워드를 `full_truth`에 대므로 **이 셋은 오히려 무사히 통과한다.**
      「진상에는 있는데 `setting`에 없다」를 보는 검사는 아무 데도 없다.
      자세한 것은 `docs/archetype-gaps.md`의 이 회차 절.
- [ ] **생성 루틴에게**: 다섯 편의 첫 단서가 **전부 「주변과 색이 다른 작은
      면적」**이다(치워진 매트 자리 · 물걸레질한 한 구역 · 진흙 한 뼘 · 다시 꽂힌
      핀 · 닦인 모서리 한 뼘). 현장을 만드는 기본형으로 보이는데, 번호가 곧 플레이
      순서라 **연달아 푸는 사람은 두 번째 편부터 바닥만 본다.**
