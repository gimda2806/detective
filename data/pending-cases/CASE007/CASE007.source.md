# CASE007 — 수액이 감춘 차트
> 마스터를 쓰기 위한 **이야기 소스**다. 서버는 이 파일을 읽지 않는다 —
> `app/game.ts`의 케이스 로더가 `*.master.json`만 훑기 때문에 번들에도
> 들어가지 않는다. 여기 적힌 것을 재료로 같은 폴더의 `.master.json`을 채운다.

## 배경

리모델링 재개소식을 하루 앞둔 지역 종합병원 부속 VIP 건강검진센터. 로비에서 복도 하나를 들어가면 신관 시연실이고, 그 문에는 드나든 사람이 전부 찍히는 출입기록 단말기가 달려 있다. 복도 반대쪽 끝이 원장실, 그 옆이 전산기록보관실과 약제 보관실이다.

## 톤

성과와 체면을 지키려는 조직의 압박과 개인의 은폐가 뒤섞인 폐쇄적인 병원 분위기.

## 탐정의 진입

- 경로: `legal_or_official_obligation`

탐정은 병원 법무팀의 의뢰로, 개소식 당일 아침까지 사망 경위를 규명하기 위해 검진센터에 들어온다.

## 진실

**진범**: 서지훈 (CH02)
**공범**: 없음

### 동기

서지훈은 3년 전 한 환자의 상태를 오진해 치료 시기를 놓쳐 환자가 사망했는데, 이를 은폐하기 위해 당시 진료차트를 조작해 '환자 본인 관리 소홀'로 원인을 바꿔 두었다. 리모델링 재개소식을 앞두고 기록을 전산화하던 한소율이 우연히 원본 종이차트 백업을 발견해 조작 사실을 알아채고, 개소식 기자간담회에서 이를 폭로하겠다고 예고했다.

### 수법

서지훈은 개소식 전날 밤, 약제 보관실에서 인슐린 앰플을 몰래 챙겨 신관 시연실에 준비된 'VIP 프리미엄 수액 치료'용 수액팩에 주입해 두었다가, 한소율에게 그 수액을 투여해 저혈당 쇼크사를 일으켰다.

### 결정적 시각·장소

21:20, L05 약제 보관실에서 인슐린 절취 / 23:00, L02 시연실에서 조작된 수액 투여.

### 은폐

서지훈은 새 수액 치료 제조 과정의 실수로 인한 사고사로 위장하고, 원본 차트 백업을 폐기하려 한다.

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