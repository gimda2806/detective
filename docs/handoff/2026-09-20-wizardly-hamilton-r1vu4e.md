### 2026-09-20 · `claude/wizardly-hamilton-r1vu4e` → 이주 루틴 / 다음 소설화 회차

**한 것**

- **CASE163~167 소설화 회차.** `docs/novels/CASE163.md`~`CASE167.md` 다섯 편을 올렸고,
  같은 다섯 마스터에 **분류 코드 여덟**을 적었다(`location_archetypes` ·
  `case_identity.background.*` 셋 · `full_truth`의 `method_archetypes` ·
  `motive_archetypes` · `cover_up_target` · `cover_up_method`).
  **이주 루틴(3단계)이 이 다섯을 다시 잡으면 그 축은 이미 끝나 있다.**
- **같은 다섯에서 `HERRING_CLEAR_NO_ID` 일곱 자리와
  `RELATIONSHIPS_SURFACES_NO_ID` 다섯 자리, `RELATIONSHIPS_STRAIN_NO_SUBJECT`
  한 자리를 같이 고쳤다.** 이주 루틴 3단계의 대상 코드들이므로 **163~167은 그
  목록에서 빠진다.**
- **CASE167의 `full_truth.method_archetypes`가 `["machinery"]`였다.** enum에 없는
  옛 이름이라 `LEGACY_METHOD_KEYS`가 `machine_entrapment`로 옮겨 읽고 있었고,
  실제 수법은 몸싸움 끝의 두부 손상이다. **`blunt_force`로 바로잡았으므로
  수법 축의 코퍼스 비율이 두 칸에서 각각 1건씩 움직인다.**
- **CASE164·166의 오프닝·엔딩 산문과 CASE164의 `CH04` 대사 두 줄을 다시 썼다**
  (163↔164, 165↔166이 엔딩 박자를 통째로 공유했다). **진상은 한 글자도 안 바꿨다.**
  다섯 다 `build:source`를 다시 돌렸다.
- 검사: `check:case` 다섯 건 errors 0 / `check:novel` errors 0 /
  `check:offline` 242건 완주 / `check:spelling` 0 / `tsc --noEmit` 0 / `npm run build` 통과.

**해야 할 것**

- [ ] **`CASE166.master.json`의 환기팬이 스스로 어긋난다.** `T12`와
      `full_truth.cover_up`은 진범이 사고 직후 팬을 **다시 켜 뒀다**고 적는데,
      `opening_scene`·`F-L02-OBS-01`·`E04`·`C03`은 전부 **꺼진 채**라고 적는다.
      `E04`가 꺼짐 위치를 가리키지 않으면 `C01`도 `C03`도 성립하지 않으므로
      고칠 쪽은 앞의 둘로 보이는데, **진상에 손대는 일이라 이 회차는 고치지 않고
      적어만 뒀다**(`docs/novels/CASE166.md`의 「마스터로 되먹일 만한 것」에 한 가지
      읽기도 같이 적었다). **이 사건을 다시 쓰는 쪽이 정할 일이다.**
- [ ] **`docs/archetype-gaps.md`에 폴백 패치 다섯이 쌓였다**(맨 아래
      「CASE163~167 회차」). 그중 하나는 **맞는 선언을 검사기가 반증하게 만들고
      있었다** — `inspection_audit`에 「검사·정기검사」가, `opening_completion`에
      「입주식」이 없어서 CASE164의 `background_intensity: central`이
      `BACKGROUND_INTENSITY_UNSUPPORTED`에 걸렸다. **검사기를 손대는 세션이 있으면
      이 넷이 가장 값싼 패치다.**
