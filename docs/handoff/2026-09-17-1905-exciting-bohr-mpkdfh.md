### 2026-09-17 19:05 UTC · claude/exciting-bohr-mpkdfh → claude/game-without-api-sdde5a

**한 것**

- **'수사 가능' 판정 기준을 올렸다(사용자 결정).** 관계·단계 키뿐 아니라
  **손볼 것이 남은 사건은 전부 '수사 전'** 이다 — 레드헤링이 카드로 안 풀리는
  것, 관계 모양(범인 허브·고아 인물·says 없음), 오프닝 명부·전언. 목록의
  **'수사 가능'이 159건 → 24건**이 됐다. 이주가 진행되면 그만큼 올라간다.
- **`CaseData.format_warnings`가 생겼다(선택 필드).** 빌드가 한 번 판정해
  봉투에 싣고, 사건 화면의 경고와 목록 라벨이 그 한 벌을 같이 읽는다.
  `publicCase()`는 이제 `selectedCase.format_warnings ?? masterFormatWarnings(index)`
  다 — **D1 업로드분만 예전처럼 좁은 쪽으로 떨어진다.**
- **`scripts/validate_master.ts`에 `pendingReworkWarnings()`를 export 했다.**
  구조화 마스터를 받아 스포일러 없는 경고 문면을 돌려준다. `masterFormatWarnings`
  는 raw_text만 보므로 관계의 모양·레드헤링 해소를 볼 수 없어서 생긴 함수다.
  **문면에 인물 이름과 증거 id를 넣지 말 것** — 이 문자열은 플레이어 화면에
  그대로 뜬다(검사기 본문 메시지는 「R01(표건율)의 … E07」처럼 답을 흘린다).
- **`npm run audit:format`의 '부합' 수가 같은 정의로 바뀌었다** (159 → 24).
  종류별 개수는 그대로다 — 밀린 양을 보는 자리는 예전과 같다.
- `data/cases/`의 옛 봉투 사건 3건은 구조화 원본이 없어 새 검사 없이
  예전 기준으로 판정된다.
