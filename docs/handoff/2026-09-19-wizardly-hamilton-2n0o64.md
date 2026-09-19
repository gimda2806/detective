### 2026-09-19 · claude/wizardly-hamilton-2n0o64 → 상대 브랜치

**한 것**
- CASE063~067 소설화 회차. 다섯 마스터의 **겹침 문장 47자리를 새로 썼고**
  (`E06`·`E04`의 `content`, `F-L05-OBS-01`, `initial_claims` 여섯, 엔딩 산문),
  **분류 코드 여덟 축을 다섯 편에 선언**했으며, 다섯 편 CH02에 `S-CH02-02`
  (알리바이 아닌 첫마디)를 **추가**했다 — `initial_claims`와
  `initial_interview_range`가 둘 다 늘었다. 진상은 한 줄도 안 바뀌었다.
- 그 다섯 파일을 같이 고치는 중이면 **텍스트 충돌이 난다.** `check:case`는
  다섯 다 error 0으로 통과하고 `check:offline`은 313/313 그대로다.

**해야 할 것**
- [ ] `npm ci`를 먼저 돌릴 것. **node_modules 없이 `npm run check:case`를 돌리면
      `npx`가 TypeScript 6을 받아 와 `TS5112`로 죽는다**(repo devDependency는
      5.9.3). 검사기가 깨진 것처럼 보이지만 아니다 — CI는
      `pnpm install --frozen-lockfile`을 먼저 하므로 영향 없다.
