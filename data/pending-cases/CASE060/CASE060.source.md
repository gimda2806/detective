# CASE060 — 진공이 삼킨 신호
> 마스터를 쓰기 위한 **이야기 소스**다. 서버는 이 파일을 읽지 않는다 —
> `app/game.ts`의 케이스 로더가 `*.master.json`만 훑기 때문에 번들에도
> 들어가지 않는다. 여기 적힌 것을 재료로 같은 폴더의 `.master.json`을 채운다.

## 배경

시리즈A 투자 라운드 종료 서명을 하루 앞둔 소형위성 스타트업 '스텔라오빗(StellarOrbit)'의 위성 조립·시험동. 발사 전 마지막 열진공시험이 한창이던 늦은 밤, 수석 시스템엔지니어가 챔버 안에서 의식을 잃은 채 발견돼 병원으로 옮겨졌으나 사망이 확인된다.

## 톤

첨단기술 스타트업의 투자 압박과 동료 간 신뢰가 시험대에 오르는 긴장감 있는 분위기.

## 탐정의 진입

- 경로: `personal_stake`

탐정은 몇 해 전 얼결에 스텔라오빗의 창업 멤버였던 대학 동기에게 소액을 투자해 지분을 나눠 받은 적이 있다. 이번 시리즈A가 불발되면 그 지분도 휴지조각이 될 판이라, 서명식 전 마지막으로 시설을 둘러보러 들른 참이었다.

## 진실

**진범**: 좌민재 (CH03)
**공범**: 없음

### 동기

좌민재는 예산 절감 압박 속에서 비공인 저가 부품을 쓰고 공인시험성적서를 위조해 왔다. 도원영이 부품 로트번호 불일치를 발견하고 시리즈A 실사단에 알리겠다고 못박자, 서명 전에 이를 막아야 했다.

### 수법

좌민재는 시험관제실 단말에서 챔버 산소농도 표시값을 조작하는 스크립트를 실행해 실제 저산소 상태에서도 정상 수치가 뜨게 만들고, 챔버 질소 퍼지 밸브를 수동으로 열어둔 채 자동 환기 시퀀스를 건너뛰게 했다. 도원영은 정상 수치를 믿고 마스크 없이 챔버 안으로 들어갔다가 저산소 상태에서 의식을 잃었다.

### 결정적 시각·장소

21:40, L04 시험관제실에서 산소농도 표시값 조작 / 22:00, L03 챔버실에서 밸브 수동조작 / 22:30, L03 챔버실에서 도원영이 챔버에 진입.

### 은폐

좌민재는 '표준 절차대로 확인했는데 이상 없었다'고 진술하며 접속 로그가 자신을 가리키지 않기를 바랐다.

---

## 이 소스가 마스터의 어디로 가는가

| 소스 | 마스터 |
| --- | --- |
| 배경 | `locations[]`, `characters[].role`, `relationships[]` |
| 톤 | `opening_scene.narrative`, `ending_scene.narrative` |
| 탐정의 진입 | `opening_scene.narrative`, `opening_scene.detective_entry_time` |
| 동기 | `contradiction_stages`, `red_herrings`, `final_deduction.motive` |
| 수법 | `actual_timeline`, `evidence[]`, `final_deduction.method` |
| 결정적 시각·장소 | `actual_timeline`, `final_deduction.key_connection` |
| 은폐 | `actual_timeline`의 은폐 항목, `red_herrings`, `characters[].initial_claims` |
`full_truth.responsible_character_id`만은 마스터에 그대로 남는다 — 진범 판정,
타임라인 필터(`filterSafeTimelineFacts`), 대립 단계가 전부 그 값에 걸려 있다.