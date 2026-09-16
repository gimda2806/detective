# CASE015 — 재가 남긴 흔적
> 마스터를 쓰기 위한 **이야기 소스**다. 서버는 이 파일을 읽지 않는다 —
> `app/game.ts`의 케이스 로더가 `*.master.json`만 훑기 때문에 번들에도
> 들어가지 않는다. 여기 적힌 것을 재료로 같은 폴더의 `.master.json`을 채운다.

## 배경

국가 사적지 지정 심사를 사흘 앞둔 외딴 섬의 옛 등대 '가막여 등대'와 부속 해양유물전시관. 등대지기 사택을 개조한 소규모 게스트하우스에 소수의 투숙객만 받고 있다.

## 톤

파도 소리와 소금기, 고립된 섬 특유의 정적 속에서 서서히 드러나는 밀거래의 흔적.

## 탐정의 진입

탐정은 개인 휴가로 예약해 둔 등대 게스트하우스에 투숙객으로 머물던 중, 마지막 밤 23시가 넘어 등탑에서 난 불과 소동에 휘말리며 사건과 우연히 마주친다.

## 진실

**진범**: 서도협 (CH01)
**공범**: 없음

### 동기

서도협은 수년간 전시관 수장고의 진품 유물 일부를 몰래 빼돌려 개인 소장가에게 팔고, 그 자리를 정교한 복제품으로 채워 넣어 왔다. 국가 사적지 지정 심사에 따른 전수조사가 예고되자 발각을 우려하던 중, 신입 학예사 문가온이 유물 대조 작업에서 복제품을 알아채고 다음 날 아침 심사위원에게 알리겠다고 하자 이를 막으려 했다.

### 수법

서도협은 옛 감정서 원본을 보여주겠다는 핑계로 문가온을 등탑 램프실로 불러들인 뒤, 몸싸움 끝에 유물 운반용 나무상자로 머리를 가격해 살해했다. 이어 램프실 바닥에 등유를 쏟아붓고 불을 질러, 화재로 인한 사고사처럼 위장했다.

### 결정적 시각·장소

22:00, L02 등탑 램프실에서 둔기로 가격해 살해 / 22:20, L02에서 방화로 위장.

### 은폐

서도협은 화재가 낡은 등유 램프의 누유로 인한 사고라고 주장하며, 자신은 그 시각 계속 전시관 사무실에서 서류 작업을 했다고 진술하려 한다.

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