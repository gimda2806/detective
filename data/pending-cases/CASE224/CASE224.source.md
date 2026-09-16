# CASE224 — 활자가 멈춘 시간
> 마스터를 쓰기 위한 **이야기 소스**다. 서버는 이 파일을 읽지 않는다 —
> `app/game.ts`의 케이스 로더가 `*.master.json`만 훑기 때문에 번들에도
> 들어가지 않는다. 여기 적힌 것을 재료로 같은 폴더의 `.master.json`을 채운다.

## 배경

오래된 상가 골목 안쪽, 3대째 이어온 골동 타자기·수동인쇄기 복원 전문점 '활자와 시간'. 매장 뒤편 복원작업실 천장에는 무거운 기계를 다락 보관고로 실어 나르는 낡은 체인 호이스트가 지금도 그대로 쓰이고 있다. 특별한 행사나 마감 없이 흘러가는 평범한 화요일 오후, 탐정은 먼 친척의 유산 정리 소송에서 법원이 지정한 재산 목록 확인 절차에 따라 이곳에 보관된 골동 타자기 한 대의 소재를 직접 확인하고 서류에 서명을 받으러 방문한 참이다.

## 톤

차분하고 씁쓸한 여운이 남는 미스터리, 오래된 연인 관계의 균열을 다루는 톤

## 탐정의 진입

- 경로: `legal_or_official_obligation`

탐정은 먼 친척의 유산 정리 소송 때문에, 법원이 지정한 재산 목록 확인 절차에 따라 골동 타자기 한 대의 소재를 확인하고 서류에 서명을 받기 위해 이 공방을 방문했다.

## 진실

**진범**: 은태경 (CH01)
**공범**: 없음

### 동기

은태경과 황유상은 12년째 연인이자 동업자였으나, 황유상이 다른 사람과 결혼을 준비하며 관계를 완전히 정리하려 하자, 버림받는다는 사실을 받아들이지 못한 은태경이 그를 없애기로 결심한다.

### 수법

은태경이 며칠 전 복원작업실 천장 체인 호이스트의 정지용 톱니를 미리 갈아 마모시켜 두고, 사건 당일 황유상이 혼자 사다리에 올라 상자를 끌어올리던 중 브레이크 손잡이를 완전히 풀어놓아 상자가 그대로 떨어지게 만들어 그를 사다리에서 떨어뜨린다.

### 결정적 시각·장소

사건 당일 14시 15분경, 복원작업실 천장 호이스트 아래 사다리.

### 은폐

사고 다음날 은태경이 마모된 톱니를 미리 준비해 둔 새 부품으로 몰래 교체하고, 낡은 기계라 부품이 자연스럽게 마모돼 생긴 사고였을 뿐이라고 먼저 이야기를 꺼낸다.

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