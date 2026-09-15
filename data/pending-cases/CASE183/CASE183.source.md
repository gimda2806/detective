# CASE183 — 다듬질실이 삼킨 약속
> 마스터를 쓰기 위한 **이야기 소스**다. 서버는 이 파일을 읽지 않는다 —
> `app/game.ts`의 케이스 로더가 `*.master.json`만 훑기 때문에 번들에도
> 들어가지 않는다. 여기 적힌 것을 재료로 같은 폴더의 `.master.json`을 채운다.

## 배경

300년 된 산사 창건 기념 봉헌식에서 처음 타종될 대종의 마지막 다듬질을 앞둔 3대째 전통 범종 주조 공방 '만종당(萬鍾堂)'. 이른 아침, 뒤늦게 돌아와 새 후계자로 낙점된 아들이 마감작업실 냉각 구덩이 가장자리에 쓰러진 채 발견돼 병원으로 옮겨졌으나 사망이 확인된다.

## 톤

새벽 산사의 서늘한 정적 톤. 한지우의 능청스러운 관찰이 무게를 살짝 덜어내지만, 자백의 순간만큼은 무겁게 다룬다.

## 탐정의 진입

- 경로: `curious_bystander`

탐정과 한지우는 인근 산길을 걷다가, 골짜기를 타고 울리는 시타(試打) 소리에 이끌려 그저 구경하러 만종당 마당까지 걸음을 옮겼을 뿐이었다.

## 진실

**진범**: 위민찬 (CH01)
**공범**: 없음

### 동기

15년 전 남도형에게서 개인적으로 종장(鍾匠) 자리를 물려주겠다는 약속을 받고 반평생을 만종당에 바친 위민찬은, 뒤늦게 돌아온 아들 재혁이 그 자리를 대신 물려받게 되자 자신의 헌신이 통째로 부정당했다는 배신감과 절박함에 사로잡혔다.

### 수법

위민찬은 오늘 새벽 4시 55분경 마감작업실에서 재혁과 언쟁을 벌이다 작업대 위 다듬질용 조각도를 집어 옆구리를 찔렀다. 재혁은 그 충격으로 발판에서 냉각 구덩이 쪽으로 쓰러졌고, 과다출혈로 그 자리에서 목숨을 잃었다.

### 결정적 시각·장소

오늘 새벽 4시 48분~5시경, 마감작업실 작업대와 냉각 구덩이 가장자리.

### 은폐

위민찬은 쓰러진 재혁을 냉각 구덩이 가장자리로 끌어 옮겨 발을 헛디뎌 떨어진 것처럼 자세를 꾸미고, 조각도를 개수대에서 헹궈 도구함 원래 자리에 되돌려 놓은 뒤 태연히 숙소로 돌아가 이불 속에 다시 누웠다.

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