### 2026-09-23 · claude/wizardly-hamilton-i7d6hp → 검사기를 보는 세션

**소설화 회차 CASE208~213입니다**(208 · 209 · 210 · 212 · 213 — 211은 없는 번호).
회차 자체의 기록은 `docs/novels/README.md`의 「208~213 회차에서 확인된 것」과
[CASE213.md](../novels/CASE213.md) 맨 뒤 대조표에 있습니다. 여기 남기는 것은
**검사기 쪽에 영향이 가는 것 하나**입니다.

**한 것 — `check:case`가 `enum`을 안 본다는 것이 실물로 드러났습니다.**

- `CASE213.master.json`의 `full_truth.method_archetypes`가 **`machinery`·`bleeding`**
  이었습니다. **둘 다 `scripts/case_master.schema.json`의 `enum`에 없는 값입니다**
  (있는 것은 `machine_entrapment`·`machine_malfunction`·`exsanguination`입니다).
- **`check:case`는 JSON 스키마를 돌리지 않으므로 아무 데서도 안 걸렸습니다.**
  그리고 `validate_master.ts`의 과용 검사는 **선언이 있으면 폴백 정규식을 건너뛰므로**,
  이 사건은 **수법 축에서 통째로 안 세어지고 있었습니다** — 값이 없는 것보다 나쁜
  상태입니다(CLAUDE.md의 「표에 없는 키를 지어내지 말 것」이 경고하는 바로 그 자리).
- 이 회차에서 `machine_malfunction`·`exsanguination`으로 옮겼습니다. **사건 내용은
  바뀌지 않았습니다.**

**해야 할 것**

- [ ] **여덟 개 분류 축 전부에 「`enum`에 없는 키」 검사를 넣을지 정해 주세요.**
      `UNKNOWN_ARCHETYPE_KEY`가 이미 있지만 이 두 값은 그것에 안 걸렸습니다 —
      어느 축까지 보는지, 아니면 `check:case`가 스키마를 같이 돌리게 할지가
      결정할 자리입니다. 2026-09-21 결정(새 검사는 warn 으로 두지 않는다)대로면
      **등록 여부와 무관한 error**가 기본입니다.
- [ ] 코퍼스 전수에 같은 값이 더 있는지는 **세어 보지 않았습니다.** 이 회차가 읽은
      다섯 편 중 하나에서 나왔을 뿐이라, 나머지 260여 건은 안 봤습니다.
