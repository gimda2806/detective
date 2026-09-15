# CASE197 — 마지막 크레딧
> 마스터를 쓰기 위한 **이야기 소스**다. 서버는 이 파일을 읽지 않는다 —
> `app/game.ts`의 케이스 로더가 `*.master.json`만 훑기 때문에 번들에도
> 들어가지 않는다. 여기 적힌 것을 재료로 같은 폴더의 `.master.json`을 채운다.

## 배경

3년 전 견습을 그만둔 인연이 있는 고전 오락기 복원 공방 '레트로포지'. 오늘 오후 늦게 소부품 세척실에서 대표 방주협이 쓰러진 채 발견돼 병원으로 옮겨졌으나 사망이 확인된다.

## 톤

옛 공방에 대한 정감과 갑작스러운 사건의 냉랭함이 교차하는 분위기.

## 탐정의 진입

- 경로: `returning_former_affiliate`

탐정은 3년 전 이곳에서 오락기 수리를 배우며 일했던 인연으로, 오늘은 순전히 개인적인 용무로 옛 동료 서인석을 만나러 레트로포지에 들렀다.

## 진실

**진범**: 탁현조 (CH02)
**공범**: 없음

### 동기

탁현조는 3년 전 방주협의 아들이 저지른 부품 절도를 자신이 뒤집어쓰고 공방에서 쫓겨나 업계에서 신뢰를 잃었다. 최근 우연히 진범이 방주협의 아들이었다는 확증을 얻은 탁현조는, 감정 의뢰를 핑계로 방문을 계획해 방주협에게 사실을 인정하고 사과할 것을 요구했으나 방주협이 이를 무시하고 오히려 헐값 감정가로 그를 다시 모욕하자 준비해 온 대로 그를 살해했다.

### 수법

탁현조는 작업대 위에 놓여 있던 낡은 진공관 테스터기로 방주협의 뒤통수를 가격해 절명시켰다. 이후 시신을 옆방 소부품 세척실로 옮기고 오래된 세척 용제 통을 바닥에 쏟은 뒤 환풍기를 꺼 두어, 환기 불량 상태에서 유기용제 증기에 중독돼 쓰러진 사고사처럼 보이게 했다.

### 결정적 시각·장소

15:36, L02 메인 작업실에서 가격 / 15:45, L02→L03 시신 이동 / 15:50, L03 환풍기 차단 및 용제 살포

### 은폐

탁현조는 세척실 문을 닫아 용제 냄새가 빠지지 않게 하고, 태연히 프론트를 지나 건물을 빠져나가 알리바이를 남기지 않았다.

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