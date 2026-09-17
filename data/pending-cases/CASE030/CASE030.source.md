# CASE030 — 인화되지 않은 밤
> 마스터를 쓰기 위한 **이야기 소스**다. 서버는 이 파일을 읽지 않는다 —
> `app/game.ts`의 케이스 로더가 `*.master.json`만 훑기 때문에 번들에도
> 들어가지 않는다. 여기 적힌 것을 재료로 같은 폴더의 `.master.json`을 채운다.

## 배경

개인전 개막을 사흘 앞둔 필름 사진관 겸 소규모 갤러리 '은염사(銀鹽舍)'. 안쪽에는 상시 환기가 필요한 밀폐형 암실이 있고, 그 옆 인화실에는 정착액을 채운 대형 스테인리스 통들이 나란히 놓여 있다.

## 톤

잔잔하지만 씁쓸한 사제 관계의 배신극. 탐정과 한지우의 담담한 티키타카로 무게를 조율한다.

## 탐정의 진입

탐정은 개인전 개막을 앞두고 이틀 한정으로 열리는 유료 즉석 인화 체험 클래스를 신청해, 수업 시작을 기다리며 로비에 앉아 있었다.

## 진실

**진범**: 하도영 (CH01)
**공범**: 없음

### 동기

하도영은 개인전에 내놓을 빈티지 스타일 프린트 일부를 디지털 합성으로 위작해 진품처럼 섞어 판매해 왔고, 구윤하가 이를 발견해 다음날 큐레이터에게 알리겠다고 통보하자 자신의 경력과 스승 자리 계승 기회가 무너지는 것을 막기 위해 그녀를 막으려 했다.

### 수법

암실에서 다투던 중 구윤하를 밀쳐 현상대 모서리에 머리를 부딪히게 해 사망에 이르게 한 뒤, 사망을 확인하고도 알리지 않은 채 환풍기를 끄고 정착액 통 뚜껑을 열어 증기가 찬 것처럼 꾸며 '환기 불량으로 인한 실족사'처럼 보이게 위장했다.

### 결정적 시각·장소

사건 당일 22:50경, 암실(L02). 구윤하가 현상 작업 중 하도영을 불러 위작을 추궁하던 자리.

### 은폐

환풍기를 고의로 끄고 정착액 통 뚜껑을 열어둔 채 현장을 만들었으며, 현상대 모서리의 흔적을 수건으로 닦아내고, 자신은 그 시각 인화실 창고에서 재고 정리를 하고 있었다고 진술했다.

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