### 2026-09-20 · claude/wizardly-hamilton-hcbhlu → 상대 세션

**한 것**
- **CASE119의 제목이 바뀌었다.** 「탈산조가 삼킨 서명」 → **「발판은 젖지 않았다」**
  (`TITLE_TEMPLATE_OVERUSE`, 「○가 삼킨 ○」 21건). 고친 곳이 셋이다 —
  `data/pending-cases/CASE119/CASE119.master.json`의 `case_identity.title`,
  `data/case_registry.json`의 `CASE119.title`, 그리고 `build:source`로 다시 뽑은
  `CASE119.source.md`. **옛 제목을 문자열로 물고 있는 코드가 있으면 조용히
  어긋난다** — 저장 행은 제목으로 사건을 가르므로(`app/game.ts`의
  `isStateForDifferentCase`), CASE119를 진행 중이던 저장이 있으면 다른 사건으로
  읽힌다(코퍼스 규칙상 정상 동작이고, 알고만 있으면 된다).
- CASE117~121 마스터 다섯에 **분류 코드 여덟 칸**을 적었다(`method_archetypes`·
  `motive_archetypes`·`location_archetypes`·`background.*`·`cover_up_*`).
  진상은 한 글자도 안 바뀌었다.
- **CASE121의 마스터 문장 열둘을 다시 썼다**(`audit:duplication` 겹침). 열둘이
  전부 **CASE122~125와 같은 문장**이었다 — `surface_incident`의
  「외부인의 침입 흔적은 확인되지 않았다」(코퍼스 최다 15건), `pressure_responses`
  여섯, `voice_profile` 둘, `world_fact`·`proves`·`discovery_condition` 각 하나.
  **122~125를 건드리는 작업이 있으면 같은 문장이 거기 그대로 있다**(이 회차는
  121 몫만 고쳤다 — README 「목록을 들고 일괄 치환하지 않는다」).
- 그 밖에 마스터를 손댄 것: CASE118 `T10.world_fact`의 피해자 이름 오기
  (서형준 → 남연우), CASE119의 `detective_entry_time`에 시각 넣기
  (「사건 다음날 아침」 → `사건 다음날 09:20`)·`knows[].content` 넷을 1인칭으로·
  `L01` 행동 문구의 「캐묻는다」 → 「묻는다」, CASE120 `S-CH02-03`의 문장부호 오타와
  `hidden_until` 한 칸 추가(`KNOWS_UNGATED_FLOOD`), CASE118·121의
  `CLAIMS_ALIBI_ONLY` 넷에 알리바이 아닌 첫마디 추가, `surfaces_when` 넷에 괄호 id.
- 검사: `check:case` 다섯 다 errors 0, `check:novel` errors 0,
  `check:offline` 255/255 완주, `check:spelling` 0.

**해야 할 것**
- [ ] 없음. 위는 알림이고, 처리할 것이 생기면 이 파일을 지우지 말고 그 아래
      자기 블록에 적을 것.
