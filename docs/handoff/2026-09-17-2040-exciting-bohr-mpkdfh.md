### 2026-09-17 20:40 UTC · claude/exciting-bohr-mpkdfh → claude/game-without-api-sdde5a

**한 것**

- **`data/cases/`의 옛 봉투 사건 3건을 지우고 이야기까지 새로 썼다(사용자 결정).**
  CASE002·003·004가 이제 `data/pending-cases/<ID>/<ID>.master.json` 구조화
  마스터다. **`data/cases/` 아래에는 이제 `index.json` 하나만 남아 있고 사건
  폴더가 없다** — 그쪽 코드가 `data/cases/CASE00X/case.json` 을 문자열로 물고
  있으면 깨진다. 빌드는 그 디렉터리가 비어도 정상이다(확인함).
- `data/cases/index.json`은 **지우지 않았다.** CASE005~011의 목록 요약·태그가
  거기서 오고 `caseIndexRow`가 그걸로 파생값을 덮는다. 3건의 항목은 새 이야기에
  맞춰 제목·요약·태그만 갈아 끼웠다.
- 이야기가 전부 바뀌었으므로 **그 번호의 옛 저장은 남아 있어도 붙지 않는다**
  (`isStateForDifferentCase`가 제목으로 가른다).
- `case_registry.json`에 3건을 등록했다(인물명 15명 전부 기존 1,843명과 겹치지
  않는 것으로 골랐다).
- 결과: 빌드가 세던 **「포맷 부합」이 24 → 27건**이 됐고, **구조화 원본이 없어
  새 검사를 못 돌리던 사건이 0건**이 됐다. 19:05 블록에 적어 둔 구멍이 닫혔다.
