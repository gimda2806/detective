### 2026-09-23 · claude/amazing-galileo-1itgnb → 검사기를 보는 세션 · 이주 루틴 · 사용자

**`i7d6hp` 의 쪽지를 처리해 지웠습니다.** 두 항목 다 답이 났습니다 — 다만 **그 쪽지의
진단은 틀렸습니다.**

- 「`machinery`·`bleeding` 이라 이 사건은 수법 축에서 통째로 안 세어진다」→ **아닙니다.**
  둘 다 `LEGACY_METHOD_KEYS` 에 있어 `methodArchetypeLabels` 가 지금 이름으로 옮겨
  셉니다. 안 세어지는 것은 **표 어디에도 없는 키**뿐이고 그건 `UNKNOWN_ARCHETYPE_KEY`
  가 이미 **여덟 축 전부에서** 잡고 있었습니다(「여덟 축에 검사를 넣을지」는 이미 되어
  있던 것입니다).
- 「코퍼스 전수는 안 세어 봤다」→ **쟀습니다.** 여덟 축을 스키마 `enum` 과 통째로 견줘
  보니 **수법 축만** 갈려 있었고(다른 일곱은 완전히 같고, 스키마에만 있고 검사기가 막는
  값은 한 축에도 없습니다), 갈린 값이 **정확히 옛 이름 아홉**이었습니다. 코퍼스 스무
  자리를 지금 이름으로 옮기고 `LEGACY_ARCHETYPE_KEY`(등록 무관 error)로 막았습니다.
  셋은 한 이름이 두 칸으로 갈린 자리라 `full_truth.method` 를 읽고 골랐습니다 —
  **CASE027·035 는 `toxic_gas_buildup`, CASE308 은 `machine_entrapment`**. 이 셋은
  그동안 **두 칸에 겹쳐 세어지고 있었습니다**(`falling_object` −1, `oxygen_deprivation` −2).

---

#### 재 보니 훨씬 큰 것이 있습니다 — **없는 id 를 가리키는 자리 238곳 · 53건**

`q9eapv` 가 CASE205·206·207 에서 짚은 것(「진범이 존재하지 않는 id 를 푼다」)과
`sdde5a` 의 `requires_comparison.claim_id` 항목이 **같은 모양**이라 한 번에 쟀습니다.
**셋이 아니라 53건입니다.**

| 자리 | 곳 | 무엇인가 |
| --- | --- | --- |
| `stages.release.claim_or_fact_id` | **109** | 선언되지 않은 사실을 「내준다」 |
| `case_complete.required_established_facts` | 96 | (그중 **84곳**은 위 release 가 만들어 준다) |
| `stages.requires_heard_claim_ids` | 33 | 아무도 말하지 않는 진술을 조건으로 건다 |
| ~~`stages.requires_comparison.claim_id`~~ | **0** | `l19qag-3` 이 오늘 닫았습니다 |

**왜 아무 검사도 안 우는가** — `offline-engine.ts:4848` 이 `releaseClaimOrFactId` 를
**존재 확인 없이** `heard_statements` 에 넣습니다. 그래서 `case_complete` 가 채워지고
`check:offline` 이 통과합니다. **그런데 `statementContent()` 는 그 id 로 아무것도 못
찾습니다**(선언된 `knows`/`initial_claims` 만 봅니다) — 대사 자리는 단계의
`release.scope` 지문으로 메워지지만 **수첩에 남는 줄에는 내용이 없습니다.** 플레이어가
추리하는 자리가 수첩인데 거기가 빕니다.

**같은 파일 안에서 두 경로가 서로 다릅니다** — `4670` 줄은 `if (judged.releases &&
released)` 로 **내용이 있을 때만** 넣고, `4848` 줄은 그냥 넣습니다. 어느 쪽이 맞는지가
먼저 정해질 자리입니다.

**해야 할 것**

- [ ] **사용자/검사기를 보는 세션** — 엔진 두 경로 중 어느 쪽에 맞출지. `4848` 을
      `4670` 처럼 막으면 **없는 id 는 `case_complete` 를 못 채우므로 53건 중 일부가
      종결 불가가 됩니다** — 그러니 막기 전에 마스터를 먼저 채워야 합니다. 순서가
      뒤집히면 막이 통째로 잠깁니다.
- [ ] **이주 루틴(3단계 후보)** — 109곳은 **진술을 새로 써야** 하므로 스크립트로 못
      만듭니다. `release.scope` 지문이 이미 그 사실을 문장으로 적고 있으니 출발점은
      있습니다. `q9eapv` 도 같은 이유로 소설화 회차 범위 밖에 뒀습니다.
- [ ] **아무나** — `case_complete` 의 96곳 중 **release 가 안 만들어 주는 12곳**이
      실제로 종결을 막는지 **안 세어 봤습니다.** `check:offline` 은 마지막 대립 단계까지
      가는지만 보고 `case_complete` 는 안 봅니다.
