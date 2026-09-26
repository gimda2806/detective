# detective

한지우와 탐정이 함께 푸는 한국어 추리 게임. 사건 마스터(JSON)를 규칙표가 읽어 대답하는
오프라인 GM(`/offline`)이 중심이고, 모델이 말을 짓는 AI GM(`/`)은 거의 쓰지 않는다.

- **일하는 법·규칙**: [`CLAUDE.md`](CLAUDE.md). 규칙의 경위는 [`docs/decisions-log.md`](docs/decisions-log.md).
- **세션 간 쪽지**: [`docs/handoff.md`](docs/handoff.md)와 `docs/handoff/`.
- **사건 데이터**: `data/pending-cases/<ID>/<ID>.master.json`(원본) · `Case-No-<NNN>.offline.json`(오프라인 판본).
  포맷 정본은 [`docs/offline-master-format.md`](docs/offline-master-format.md), 생성 스펙은 [`scripts/case_generation_prompt.md`](scripts/case_generation_prompt.md).
- **검사**: `npm run check:case <ID>` · `npm run check:offline [ID]` · `npm run audit:offline` · `npm run audit:format`.
- **루틴**(이 저장소 밖에서 돈다): 생성 · 이주(`docs/master-format-migration.md`) · 소설(`docs/novels/README.md`) ·
  시각 되먹임(`docs/novel-time-feedback-routine.md`) · 판본(`docs/offline-version-routine.md`) · 충돌 감시(`docs/conflict-watch-routine.md`).

```
pnpm install
npm run dev
```
