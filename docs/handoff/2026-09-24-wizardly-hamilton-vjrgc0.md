### 2026-09-24 · claude/wizardly-hamilton-vjrgc0 → 전체

**한 것**

- 소설화 번호순 회차 **CASE305 · 306 · 307 · 308 · 309**. 다섯 편 다 분류 코드 여덟 축이
  거의 비어 있어(308만 1/8, 나머지 0/8) 사람이 적었다. `docs/novels/README.md` 포인터를
  「다음 차례: CASE310~314」로 되돌렸다.
- **CASE306 마스터에 옆 사건의 낱말이 세 자리 섞여 있어 고쳤다** — 엔딩 대사의
  「표건...」(CASE307 피해자 **표**준일의 성이 섞였다. 이 사건 피해자는 탁건우다),
  `evidence[E01].name`의 「**정비실** 바닥의 몸싸움 흔적」, 같은 카드 `proves`의
  「**감전이 아닌** 몸싸움 정황」. 뒤의 둘은 CASE305의 것이고 **이 사건에는 정비실도
  감전도 없다.** 셋 다 `check:case`·`check:offline`을 통과한다 — 교차참조는 id만 보고
  **낱말의 출처를 보는 축이 저장소에 없다.**
- **CASE307 `E09.content`가 쉼표로 두 문장이 이어 붙어 있었고 시각이 12시간제(「9시」)라**
  수첩의 다른 시각과 자릿수가 어긋났다. `T05`가 21시 10분이므로 21시로 고쳤다.
- **CASE307·308의 `red_herrings[R01].lingering_thread`가 빈 문자열이었다**(둘 다 `R02`만
  차 있었다). 새 사실 없이 채웠다.
- 같은 생성 회차 다섯 편이 서로 베끼던 문장들을 다시 썼다(`opening_scene` 지문,
  `ending_scene` 마지막 대사, `voice_profile`, `locations[].access`, `knowledge_limits`,
  `evidence[].discovery_condition`, 헛다리 `must_not_imply`). 코퍼스 겹침 **306종 → 292종**,
  CASE305·307이 `audit:duplication` 상위 15에서 빠졌다.
- `docs/archetype-gaps.md`에 이 회차 절을 더했다.

**해야 할 것**

- 없다. 아래는 알림이다.

- **`background_phrasing`에 고를 칸이 없는 경우가 다섯 편 연속으로 나왔다.** 이 회차
  `setting` 첫 문장이 전부 「[수식어] + [무대] + '[상호]'.」로 끝나고 **들여놓는 사건이
  한 줄도 없다.** 열여섯 칸이 전부 사건을 문장에 물리는 방식이라(`approaching`·
  `in_progress`·`on_the_day_of`…) 305와 309는 `other`로 적었다. 306·307·308은 두 번째
  문장이나 `detective_entry`에서 사건을 찾아 골랐다. **코드는 고치지 않았다** — 새 칸을
  만들지 「첫 문장이 아니라 `setting` 전체에서 읽는다」로 규칙을 고칠지는 사람이 정할
  일이고, 실측이 다섯 편뿐이다. 표는 `docs/archetype-gaps.md`와 `docs/novels/CASE309.md`
  맨 뒤에 있다.

- **`BACKGROUND_INTENSITY_UNSUPPORTED`가 이번에는 「②」로 걸렸다.** CASE307에 `central`을
  적자 검사기가 반증했는데, 열어 보니 **진상 산문이 「대회」라는 낱말을 한 번도 안 쓰는
  것**이 원인이었다(`motive`가 「온서율의 **시드**」라고만 적는다). intensity가 아니라
  `full_truth.motive`의 한 낱말을 「대회 시드」로 고쳐 풀었다 — 사건은 그대로이고
  `full_truth` 산문은 런타임이 읽지 않는 자리다. **CASE300은 같은 코드가 ①이었고(경고가
  맞아서 intensity를 내렸다), 이번이 ②다** — 같은 코드가 두 방향으로 쓰인 첫 사례이니
  이 축을 적는 다른 루틴이 참고할 자리다.

- **`craft_metal` 폴백에 「활자」가 들어 있는데, 그게 틀리게 잡는 자리가 있다.** CASE308의
  활자는 **목활자**인데(`L03`이 「목활자 서랍장」이라고 적는다) 폴백은 금속공예로 센다.
  선언을 넣어 이 편은 막았지만, **선언 없는 활판인쇄 사건이 또 오면 같은 칸으로 떨어진다.**
  「없는 낱말」이 아니라 **「있는데 틀리게 잡는 낱말」**이라 `docs/archetype-gaps.md`에
  따로 절을 뒀다.
