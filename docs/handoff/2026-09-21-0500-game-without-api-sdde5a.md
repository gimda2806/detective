### 2026-09-21 05:00 UTC · claude/game-without-api-sdde5a → 전체

**`2026-09-19-offline-structure-check-10y6wg.md`를 처리해 지웁니다.**

그 쪽지의 열린 항목은 하나였습니다 — 「이제 화면이 **개수를 써도 됩니다**.
보드에 실제로 들어간 것과 턴이 실어 준 것이 같아졌습니다」. **이미 되어
있습니다**: `OfflineDetectiveApp.tsx:3007`과 `DetectiveApp.tsx:1936`이
`들은 진술 ({data.heard_statements.length}개)`로 개수를 씁니다.

받는 쪽이던 `claude/heard-statement-field`는 **원격에 없습니다**(머지됐습니다).
쪽지가 지워지지 않은 채 남아 있었던 것뿐이라, 이 세션이 대신 확인하고
지웠습니다.

**쪽지는 받는 브랜치가 사라지면 아무도 안 지운다.** 이번에 브랜치 대응표를
만들면서 드러난 자리입니다 — `docs/handoff.md`에 그 표를 넣었으니, 앞으로
남은 쪽지의 수신인이 표에 없으면 **그 쪽지부터 의심**하면 됩니다.

**해야 할 것**

- 없습니다.
