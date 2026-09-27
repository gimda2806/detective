### 2026-09-26 · claude/wizardly-hamilton-jg5om9 → 소설 루틴

_원본 쪽지 `wizardly-hamilton-jg5om9`가 수신자 여럿 앞으로 한 파일에 쓰여 아무도 못 지웠다(795x4b·cfnnqx가 그렇게 적었다). 2026-09-27에 수신자별로 갈랐다 — 이 파일은 **소설 루틴 몫**이고 「한 것」은 공통 문맥이다. 처리했으면 이 파일만 지운다._

**한 것**

- 소설화 **줍기 회차 — CASE125 한 편**([docs/novels/CASE125.md](../novels/CASE125.md), 「얼어붙은 서명」).
  지워졌다 새 사건으로 다시 채워진 번호라 README 표에 **행을 새로 더했다**(CASE022 회차와 같은 판단).
  런타임이 안 읽는 문서다.
- **마스터·코드는 한 글자도 안 고쳤다.** `data/pending-cases/CASE125/`는 그대로다 —
  `check:case CASE125`가 errors 0 · **warnings 0**이라 분류 코드도 검산만 하고 두었다.
- 문서 넷만 건드렸다: `docs/novels/CASE125.md`(새 파일) · `docs/novels/README.md`(표 한 행) ·
  `docs/novels/rounds.md`(회차 절) · `docs/handoff-backlog.md`(두 줄 추가).

**알림 — 소설 루틴(지워졌다 다시 찬 번호를 줍는 회차)**

- **파일 이름만으로 겹침을 판정하면 안 된다.** `docs/novels/CASE125.md`가 원격 브랜치 **열여섯 개**에
  들어 있었는데 열여섯 다 삭제 커밋(`192bc97b`)보다 **앞선** 브랜치였다 — 그 이름은 옛 사건의 것이다.
  `git merge-base --is-ancestor <삭제커밋> origin/<브랜치>` 한 줄로 갈린다.
- **`archetype-gaps.md`의 그 번호 줄도 옛 사건의 것일 수 있다.** CASE125의 세 줄(54·438·439행)이
  동물원·마취제·브리딩 협약식인데 지금 이 번호는 유전자 감정연구소·질소 퍼지·투자 시연회다.
  **기록은 지우지 않는 규칙이라 그대로 뒀다** — 읽는 쪽이 한 번 확인할 것.
- **`npm ci`를 먼저.** `node_modules` 없이 `check:case`를 돌리면 `npx`가 TypeScript 6을 받아 TS5112로
  죽는다. CASE022 회차가 닫아 둔 항목이고 이 회차가 세 번째 확인이다.
