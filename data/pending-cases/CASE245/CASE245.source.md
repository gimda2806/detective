# CASE245 — 짠물 위의 마지막 걸음
> 마스터를 쓰기 위한 **이야기 소스**다. 서버는 이 파일을 읽지 않는다 —
> `app/game.ts`의 케이스 로더가 `*.master.json`만 훑기 때문에 번들에도
> 들어가지 않는다. 여기 적힌 것을 재료로 같은 폴더의 `.master.json`을 채운다.

## 배경

3대째 이어온 전통 천일염 염전 '해도염전(海島鹽田)'. 사촌 남매인 대표 어겸도와 반가온이 소금밭과 직판장을 나눠 맡아 함께 운영해 왔다. 이번 가을 태풍이 지나간 뒤 첫 대조(大潮) 물때를 맞아 이른 새벽부터 소금 걷이가 한창이던 가운데, 함수 저장조 다리 근처에서 어겸도가 쓰러진 채 발견된다.

## 톤

짠내 나는 새벽 공기와 오래된 감정이 뒤섞인 씁쓸한 톤. 탐정과 한지우의 담담한 티키타카로 무게를 던다.

## 탐정의 진입

- 경로: `onsite_recognized_and_asked`

탐정과 한지우는 인근 해안 둘레길을 걷다 염전 앞 정자에서 잠시 쉬고 있었는데, 예전 사건에서 도움을 받았던 염부 반장 태이랑이 탐정의 얼굴을 알아보고 서둘러 다가와 도움을 청한다.

## 진실

**진범**: 반가온 (CH01)
**공범**: 없음

### 동기

오랫동안 비밀 연인으로 지내온 어겸도가 국이현과의 혼인과 사업 제휴를 앞두고 자신과의 관계를 완전히 정리하려 하자, 반가온이 배신감과 상실감에 사로잡혀 그를 살해하기로 결심했다.

### 수법

반가온이 소금창고에서 톱으로 함수 저장조 다리의 지지목 안쪽을 미리 얇게 잘라 놓고, 대조 물때에 어겸도가 그 다리를 건너 수문을 점검하러 가는 순간 다리가 무너지도록 만들어 그를 깊은 함수 저장조에 빠뜨렸다.

### 결정적 시각·장소

사건 당일 새벽 5시 40분, 해도염전 함수 저장조 다리 위.

### 은폐

반가온은 다리가 오래돼 낡아서 저절로 내려앉은 사고처럼 보이도록, 평소에도 다리 판자가 삐걱거린다는 말을 여러 사람에게 미리 흘려두고, 자신은 그 시각 내내 직판장에서 개점 준비를 하고 있었다고 둘러댔다.

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