# CASE050 — 출항하지 못한 이름
> 마스터를 쓰기 위한 **이야기 소스**다. 서버는 이 파일을 읽지 않는다 —
> `app/game.ts`의 케이스 로더가 `*.master.json`만 훑기 때문에 번들에도
> 들어가지 않는다. 여기 적힌 것을 재료로 같은 폴더의 `.master.json`을 채운다.

## 배경

글로벌 세일링 장비 브랜드와의 후원 계약 갱신 발표를 사흘 앞둔 요트클럽 마리나 '한별요트클럽'. 계약 갱신 조건인 국제 초청 레가타 출전을 앞둔 이른 새벽, 계류장에 정박된 경기용 요트 마스트 아래에서 수석 코치가 삭구에 다리가 얽힌 채 물에 잠긴 상태로 발견된다.

## 톤

후원 계약 갱신을 앞둔 팽팽한 긴장과 이른 새벽 바닷바람이 뒤섞인 마리나.

## 탐정의 진입

- 경로: `transit`

탐정은 다른 지역으로 가는 연안 여객선 환승을 기다리며 마리나 대합실에서 이른 새벽 시간을 보내고 있었다. 마침 근처 계류장에서 터진 비명에 걸음을 옮긴다.

## 진실

**진범**: 배준영 (CH01)
**공범**: 없음

### 동기

배준영은 클럽 경영난 속에서 거액의 후원금을 조건으로 내건 스폰서사 오너의 딸 석하늘을 국제 초청 레가타에 출전시키기 위해, 규정상 요구되는 국내대회 출전 이력을 위조해 등록 서류를 조작했다. 노경민이 이를 발견하고 후원사에 알리겠다고 하자 그의 입을 막으려 했다.

### 수법

배준영은 5시 10분경 계류장에서 노경민과 실랑이를 벌이다 05시 20분경 그를 밀쳐 넘어뜨렸고, 노경민은 쓰러지며 삭구에 다리가 얽힌 채 물에 빠져 익사했다. 야간 단독 점검 중 실족한 사고처럼 보이도록 정리했고, 노경민이 위조 사실을 정리해 둔 서류 봉투를 챙겨 없앴다.

### 결정적 시각·장소

05:10, L04에서 실랑이 / 05:20, L04에서 노경민이 삭구에 얽혀 익사

### 은폐

배준영은 노경민이 야간 단독 점검 중 발을 헛디뎌 삭구에 걸린 채 익사한 사고라고 주장하며, 서류 봉투가 사라진 사실은 언급하지 않는다.

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