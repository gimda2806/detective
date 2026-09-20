### 2026-09-20 · claude/wizardly-hamilton-2hol2m → 전체

**한 것**

- **소설화 회차 CASE112~116**을 올렸습니다(`docs/novels/CASE11[2-6].md`).
  런타임은 그 폴더를 안 읽으므로 코드에는 영향이 없습니다. 다섯 마스터를
  같이 고쳤고, 고친 것은 전부 **필드 값**이지 사건의 진상이 아닙니다.
- **`data/pending-cases/CASE11[2-6]/*.master.json`을 건드렸습니다.** 다른
  세션이 이 다섯을 같이 잡고 있었다면 충돌합니다. 바꾼 축:
  - 분류 코드 여덟(`method_archetypes`·`motive_archetypes`·`cover_up_target`·
    `cover_up_method`·`location_archetypes`·`background.*`)을 다섯 편 다
    새로 적었습니다. **CASE112는 `detective_entry_type`이 아예 없었습니다.**
  - `CLAIMS_ALIBI_ONLY` 다섯 줄(112 CH01, 114 CH03·CH05, 115 CH03, 116 CH03),
    `RELATIONSHIPS_STRAIN_NO_SUBJECT`(113 REL01, 115 REL01),
    `RELATIONSHIPS_SURFACES_NO_ID`(115 REL02).
  - `audit:duplication` 겹침을 다섯 편 다 0으로 만들었습니다 — **`CASE100~119`
    구간이 0%**가 됐습니다.
  - CASE115의 오타 둘(`S-CH01-01`이 문장이 깨져 있었고, `S-CH03-01`에 「저과」).
- **`docs/novels/README.md`**: 진행표에 다섯 줄, 「다음 차례」를 **CASE117~121**로,
  「112~116 회차에서 확인된 것」 절을 더했습니다. 겹침 구간 문단이 098~102를
  가리키고 있던 것도 지금 수치로 갈았습니다(이제 120번대가 상위입니다).

**먼저 읽어 주세요 — 폴백 정규식이 또 틀렸습니다**

`case_identity`/`full_truth`에 분류 코드 선언이 없으면 검사기가 산문을
정규식으로 짐작하는데, 이 회차에서 **둘이 틀렸습니다**. 앞 회차(063~067)의
「선급 **협회**」 → `association_club`과 같은 종류입니다.

- **CASE116** 「레이싱**팀**」이 `association_club`(동호회)로 잡혀
  `sports_social` 계열 비율을 올리고 있었습니다. 인증 시험을 돌리는
  사업장이고 방 다섯 중 셋이 엔지니어링 공간입니다.
- **CASE115** `full_truth.motive`의 「통보하」가 `신고·고발 차단`으로
  잡혔습니다. 죽은 사람은 신고하려던 외부인이 아니라 **이탈하려던
  공범**(`accomplice_cutoff`)입니다.

**선언이 없는 사건은 이런 식으로 조용히 엉뚱한 칸에서 비율을 올립니다.**
과용 경고를 보고 사건을 다시 설계하기 전에, **그 사건에 선언이 있는지부터**
봐 주세요.

**검사기 한 줄 — `RELATIONSHIPS_STRAIN_NO_SUBJECT`는 피해자가 주어면 언제나 걸립니다**

`scripts/validate_master.ts`의 `checkRelationships`가 `private_strain`의
첫 이름을 **`master.characters`에서만** 찾습니다. 피해자는 `key_figures`에
있으므로, 「피해자가 …했고」로 시작하는 균열은 `between`에 그 피해자가
들어 있어도 반려됩니다. **고치지 않았습니다** — 결과적으로 맞는 판정입니다
(죽은 사람은 면담이 안 되므로 오프라인에서 그 문장을 말할 입이 없습니다).
다만 메시지가 「between 밖이다」라고 말해서 원인을 짚기 어려우니, 이 자리를
손볼 사람이 있다면 메시지만 갈아 주면 좋겠습니다.

**해야 할 것**

- 없습니다. `npm run check:case`는 다섯 다 종료 코드 0이고,
  `npm run check:novel`·`npx tsc --noEmit`도 통과합니다.
  `2026-09-20-next-steps-0w9my4`가 부탁한 오프닝·엔딩 품질 축 셋
  (`OPENING_CAST_ROLLCALL`·`OPENING_INCIDENT_ONLY_HEARSAY`·
  `SCENE_DIALOGUE_MASHED`)은 이 다섯에서 **한 건도 안 걸립니다**
  — 다섯 편 다 오프닝·엔딩 산문을 마스터 원문 그대로 살렸고,
  CASE116의 엔딩만 겹침 문장 한 줄(「이렇게 될 줄은 몰랐어요」 3건)을
  바꿨습니다.
