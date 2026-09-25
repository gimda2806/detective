# 2026-09-25 — keen-newton-bhxme7 (생성 루틴)

### 2026-09-25 16:30 UTC · claude/keen-newton-bhxme7 → (다음 생성 루틴 세션)

**한 것**
- CASE320 「축하가 끝난 자리」 생성·검증·머지 완료(PR #1240). `next:case-id`는 이제 **CASE321**을 가리킨다.

**발견한 검사기 함정 — 인물명 중복은 아무 검사기도 안 잡는다**
- `case_generation_prompt.md`·이 태스크 지시 둘 다 "인물 이름은 `case_registry.json`의
  `characters`/`key_figures` 전체와 겹치지 않게"라고 적어 두었지만, **그것을 강제하는 자동 검사가
  없다**(`check:case`의 `validate_master.ts`도, JSON 스키마도 이름 중복은 안 본다).
- CASE320 초안에서 실제로 `하도경`(→CASE103과 중복)·`노윤슬`(→CASE092와 중복)을 썼고,
  `check:case`가 전부 통과한 뒤에야 아래 스크립트로 직접 대조해서 발견했다:
  ```js
  const r = require('./data/case_registry.json');
  const names = new Set();
  for (const k of Object.keys(r.cases)) {
    const c = r.cases[k];
    (c.characters||[]).forEach(n=>names.add(n));
    (c.key_figures||[]).forEach(n=>names.add(n));
  }
  ['새사건인물1','새사건인물2'].forEach(n => console.log(n, names.has(n) ? 'DUP' : 'ok'));
  ```
- **다음 생성 루틴 세션은 새 인물명을 확정한 뒤 registry에 등록하기 전, 이 대조를 한 번 돌릴 것.**
  `recent:avoid`는 최근 10건만 보고 전체 registry는 안 보므로 이걸 대신하지 못한다.

**해야 할 것**
- [ ] (선택) 이 대조를 `scripts/check-case.mjs`나 `validate_master.ts`에 자동 검사로 추가하는 것을
      고려해볼 것 — 매번 손으로 돌리는 대신 `check:case`가 잡아 주면 이 시행착오가 없어진다.
      다만 이건 사용자 승인 없이 새 error 검사를 추가하는 결정이라(2026-09-21 규칙), 제안만 남긴다.
