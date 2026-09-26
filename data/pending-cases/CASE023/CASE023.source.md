# CASE023 — 되감을 수 없는 트랙
> 마스터를 쓰기 위한 **이야기 소스**다. 서버는 이 파일을 읽지 않는다 —
> `app/game.ts`의 케이스 로더가 `*.master.json`만 훑기 때문에 번들에도
> 들어가지 않는다. 여기 적힌 것을 재료로 같은 폴더의 `.master.json`을 채운다.

## 배경

빈티지 오디오 수리점 겸 인디 레이블 사무실. 신보 발매 전날 밤, 표절 사실을 발견한 오디오 엔지니어가 테스트용 앰프를 만지다 감전사했고, 다음 날 아침 발견된다.

## 톤

인디 음악 업계 특유의 열정과 압박이 뒤섞인 폐쇄적인 작업실 분위기.

## 탐정의 진입

탐정은 매달 첫째 주 토요일마다 열리는 빈티지 오디오 동호회 정기모임에 참석하려고 레코드샵을 찾았다가, 그날 아침 안쪽 작업실에서 벌어진 소동과 우연히 마주친다.

## 진실

**진범**: 임도경 (CH02)
**공범**: 없음

### 동기

임도경은 발매를 하루 앞두고, 도재현이 신곡 샘플이 미공개 트랙과 파형이 일치한다는 표절 증거를 발견해 대표에게 알리려 한다는 사실을 알게 됐다. 표절이 알려지면 계약 자체가 깨질 상황이었다.

### 수법

임도경은 창고에서 시험용 앰프를 꺼내 작업실로 옮긴 뒤 접지 회로를 우회시켜 금속 섀시에 전류가 흐르도록 개조했다. 도재현이 퇴근 전 그 앰프를 테스트하다 감전되어 사망했다.

### 결정적 시각·장소

21:20~21:30, L03/L02에서 앰프 반출 및 배선 개조 / 22:10, L02에서 도재현이 감전사.

### 은폐

임도경은 어젯밤 내내 사무실에 있었다고 주장하고, 도재현의 죽음을 앰프 오작동에 의한 사고로 몰아가려 한다.

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