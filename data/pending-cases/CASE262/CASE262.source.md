# CASE262 — 가나슈가 삼킨 이름
> 마스터를 쓰기 위한 **이야기 소스**다. 서버는 이 파일을 읽지 않는다 —
> `app/game.ts`의 케이스 로더가 `*.master.json`만 훑기 때문에 번들에도
> 들어가지 않는다. 여기 적힌 것을 재료로 같은 폴더의 `.master.json`을 채운다.

## 배경

도심 골목 안, 3년 전 목련하가 문을 연 빈투바 초콜릿 아틀리에 '카카오단(丹)'. 손자 겸소율이 견습으로 함께 일하고, 반년 전 합류한 동업자 도유겸이 사업 확장을 주도해 왔다. 특별한 행사나 마감 없이 흘러가는 평범한 화요일 오후, 다음 달 결혼하는 단골손님에게 보낼 답례품 시식을 위해 준비된 가나슈를 맛보던 도유겸이 테이스팅룸에서 갑자기 목을 움켜쥐며 쓰러진다.

## 톤

따뜻한 가족애 속에 숨은 씁쓸한 진실을 좇는 차분한 정통 추리

## 탐정의 진입

- 경로: `personal_appointment`

탐정은 오랜 친구 헌재율과의 개인적인 약속으로 초콜릿 아틀리에 '카카오단'을 찾았다가, 마침 가게 안에서 벌어진 소동에 휘말린다.

## 진실

**진범**: 겸소율 (CH01)
**공범**: 없음

### 동기

도유겸이 목련하를 피후견인으로 지정해 지분을 인수하려는 성년후견 심판 청구를 준비하고 있다는 사실을 우연히 알게 된 겸소율이, 할머니의 자립과 아틀리에를 지키기 위해 범행을 계획했다.

### 수법

겸소율이 창고에 몰래 옮겨둔, 정식 발주 목록에 없는 땅콩 프랄린을 시식용 가나슈에 섞어 넣고, 사흘 전 혼자 점검한다는 명목으로 응급처치함의 에피네프린 주사기를 유효기간이 지난 것으로 바꿔치기해, 도유겸이 알레르기 반응을 일으켰을 때 즉각적인 처치를 받지 못하게 만들었다.

### 결정적 시각·장소

사건 당일 14시, 테이스팅룸(L01)에서 도유겸이 시식 중 쓰러진 순간과, 사흘 전 사무실(L03)에서 겸소율이 혼자 응급처치함을 조작한 시점.

### 은폐

겸소율은 공급업체 라벨 오류로 인한 우발적 알레르기 사고처럼 보이도록 꾸미고, 응급처치함 점검 기록도 정상적으로 교체가 이뤄진 것처럼 남겨두었다.

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