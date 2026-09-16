# CASE086 — 산세척실이 삼킨 등급
> 마스터를 쓰기 위한 **이야기 소스**다. 서버는 이 파일을 읽지 않는다 —
> `app/game.ts`의 케이스 로더가 `*.master.json`만 훑기 때문에 번들에도
> 들어가지 않는다. 여기 적힌 것을 재료로 같은 폴더의 `.master.json`을 채운다.

## 배경

국제보석감정원 인증 갱신 심사를 이틀 앞둔 주얼리 아틀리에 '루미에르주얼리'의 세공·감정 작업동. 출품작 마지막 세공 마무리가 한창이던 늦은 밤, 수석 보석감정사 염진완이 산세척실 안에서 의식을 잃은 채 발견돼 병원으로 옮겨졌으나 사망이 확인된다.

## 톤

국제 인증 갱신 심사를 이틀 앞둔 초조함과, 보석처럼 매끈하던 겉모습 아래 균열이 드러나는 서늘함이 뒤섞인 분위기.

## 탐정의 진입

- 경로: `outdoor_recreation`

탐정은 저녁 러닝 코스를 돌던 중 루미에르주얼리 앞 인도에 몰린 사람들을 보고 걸음을 늦췄다.

## 진실

**진범**: 황보상영 (CH03)
**공범**: 없음

### 동기

황보상영은 하급 보석을 상급으로 둔갑시킨 감정서를 발급해 시세 차익을 챙겨 온 사람이었다. 염진완이 입고대장과 실제 감정 등급 사이의 어긋남을 짚어내 국제보석감정원 심사관에게 이틀 뒤 그대로 알리겠다고 통보하자, 황보상영은 심사 전에 그 폭로를 없던 일로 만들어야 하는 처지에 몰렸다.

### 수법

다툰 직후 황보상영은 산세척실 중화조의 중화액을 고농도 원액 산으로 몰래 바꿔치기해 두었다. 마지막 세공을 마무리하던 염진완이 평소처럼 세척한 보석을 헹구려 손과 팔을 중화조에 담그자, 원액 산이 그대로 살갗에 닿아 심한 화학화상을 입혔고 염진완은 충격으로 그 자리에서 의식을 잃었다.

### 결정적 시각·장소

D-1, 20:05, L03 산세척실에서 중화액 치환 / D-1, 20:35, L03 산세척실에서 화상 및 의식 상실 / D-1, 20:55, L03 산세척실에서 중화액 원상복구.

### 은폐

황보상영은 사고 직후 중화조 액체를 다시 정상 중화액으로 교체해, 그 안에 원액 산이 담겼던 흔적을 지우려 했다.

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