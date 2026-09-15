# CASE246 — 손잡이에 남은 마지막 온기
> 마스터를 쓰기 위한 **이야기 소스**다. 서버는 이 파일을 읽지 않는다 —
> `app/game.ts`의 케이스 로더가 `*.master.json`만 훑기 때문에 번들에도
> 들어가지 않는다. 여기 적힌 것을 재료로 같은 폴더의 `.master.json`을 채운다.

## 배경

리드클라이밍 전문 체육관 '락엣지(RockEdge)'. 이번 주말 지역 유소년 리드클라이밍 예선과 성인 아마추어 초청전이 나란히 열리는 가운데, 유망주 노건표가 대회 시작 전 마지막 점검을 위해 오른 전동 세팅 리프트 위에서 쓰러진 채 발견된다.

## 톤

체육관 특유의 팽팽한 긴장감과 승부욕 아래 감춰진 집착을 그린, 담백하면서도 씁쓸한 톤. 탐정과 한지우의 가벼운 티키타카로 무게를 던다.

## 탐정의 진입

- 경로: `competitor_or_participant`

탐정은 지역 성인 아마추어 리드클라이밍 초청전에 개인 참가자로 등록해 몸을 풀고 있었고, 한지우는 관중석 난간에 기대어 그 모습을 구경하던 참이다.

## 진실

**진범**: 안태겸 (CH01)
**공범**: 없음

### 동기

오랫동안 락엣지의 대표 루트를 홀로 설계해 온 안태겸은, 자신이 평생 다듬어 온 기술적 세팅 철학이 노건표의 다이나믹 루트로 완전히 대체돼 지워지는 것을 도저히 받아들일 수 없었다. 자신의 마지막 흔적이라도 지키려는 집착에 사로잡힌 그는 노건표를 제거하기로 결심했다.

### 수법

안태겸이 사건 며칠 전 전기설비실에서 세팅용 전동 리프트의 전원 케이블 피복을 커터로 얇게 벗겨내 노출된 심선을 금속 손잡이 배선에 맞닿도록 몰래 연결해 두고, 노건표가 예선 당일 낮 홀로 리프트를 타고 올라가 손잡이를 움켜쥐는 순간 고전압이 흐르도록 만들었다.

### 결정적 시각·장소

사건 당일 낮 12시 40분경, 락엣지 리드클라이밍 홀 전동 세팅 리프트 위.

### 은폐

안태겸은 리프트가 노후 배선 탓에 스스로 고장 난 사고처럼 보이도록, 평소 심하람에게 리프트 전선이 낡았다는 말을 미리 흘려두고, 사건 당시 자신은 줄곧 접수 라운지에서 대회 진행을 돕고 있었다고 둘러댔다.

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