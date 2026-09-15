# CASE135 — 지워진 테이크
> 마스터를 쓰기 위한 **이야기 소스**다. 서버는 이 파일을 읽지 않는다 —
> `app/game.ts`의 케이스 로더가 `*.master.json`만 훑기 때문에 번들에도
> 들어가지 않는다. 여기 적힌 것을 재료로 같은 폴더의 `.master.json`을 채운다.

## 배경

글로벌 OTT 플랫폼과의 AI더빙 독점 공급계약 체결식을 사흘 앞둔 성우 전문 더빙 스튜디오 '보이스브릿지'. 체결식을 앞둔 늦은 밤, 간판 성우가 녹음 부스 안에 갇힌 채 의식을 잃은 상태로 발견돼 병원으로 옮겨졌으나 사망이 확인된다.

## 톤

화려한 스튜디오 뒤편의 반짝임과 계약 압박의 냉정함이 대비되는 톤. 탐정과 한지우의 티키타카로 무게를 덜어낸다.

## 탐정의 진입

- 경로: `unrelated_errand`

탐정은 아는 배우에게 부탁받은 소포를 대신 찾으러 보이스브릿지 건물 1층 우편실에 들렀다가, 계단 위쪽에서 다급하게 뛰어 내려오는 발소리와 마주친다.

## 진실

**진범**: 심규현 (CH02)
**공범**: 없음

### 동기

심규현은 계약 성사를 위해 하유선의 목소리 데이터를 동의 없이 AI 학습에 사용해왔고, 계약 체결식 발표 직전 하유선이 이 사실을 알아채 기자회견에서 공개적으로 문제 삼겠다고 하자 계약과 자신의 지위가 모두 무너질 것을 두려워했다.

### 수법

심규현은 사건 전날 밤 부조종실에서 부스 도어락 비상해제 회로를 절단하고 환기 배관 밸브를 잠근 뒤, 하유선에게 당일 밤 혼자 마지막 테이크를 확인해 달라는 메시지를 보내 부스에 가두었다.

### 결정적 시각·장소

전날 22:40~22:55, 부조종실(L04)에서 도어락 회로 절단 및 환기 밸브 차단 / 당일 23:10~23:30, 부스(L02)에서 하유선 질식.

### 은폐

심규현은 환기 시스템 점검일지에 정기 점검이 정상적으로 끝난 것으로 거짓 기재했고, 사건 이후에도 환기 오작동에 의한 단순 사고인 것처럼 행동하며 데이터 무단 사용 사실을 숨겼다.

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