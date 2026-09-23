# CASE247 — 멈출 사람이 없었다
> 마스터를 쓰기 위한 **이야기 소스**다. 서버는 이 파일을 읽지 않는다 —
> `app/game.ts`의 케이스 로더가 `*.master.json`만 훑기 때문에 번들에도
> 들어가지 않는다. 여기 적힌 것을 재료로 같은 폴더의 `.master.json`을 채운다.

## 배경

실내 드론레이싱 전용 경기장 '스카이서킷(SkyCircuit)'. 아마추어 파일럿들을 위한 평일 저녁 자유 연습 시간이 한창인 가운데, 배터리 충전소에서 정비팀장 편시준이 폭발성 화재에 휩싸여 쓰러진 채 발견된다.

## 톤

실내 경기장 특유의 열기와 조카를 향한 조용한 애정이 교차하는, 담담하면서도 뭉클한 톤. 탐정과 한지우의 가벼운 티키타카로 무게를 던다.

## 탐정의 진입

- 경로: `media_or_content_creation`

탐정은 개인 드론 리뷰 채널에 올릴 영상을 촬영하러 스카이서킷을 찾았고, 한지우는 촬영 보조로 따라와 트랙 옆에서 구경하고 있었다.

## 진실

**진범**: 목인석 (CH01)
**공범**: 없음

### 동기

목인석은 정비실 서랍에서 우연히 발견한 차용증 사본을 통해, 조카 진하빈이 편시준에게 금전과 이적 금지 조항으로 오랫동안 통제·착취당해왔다는 사실을 알게 됐다. 조카를 그 굴레에서 벗어나게 하려는 절박한 보호 심리에서, 그는 편시준을 제거하기로 결심했다.

### 수법

목인석이 편시준의 전용 배터리 팩에서 배터리관리시스템(BMS) 보호회로 칩을 몰래 제거하고, 미리 다듬어둔 저항체로 바꿔 끼워 과충전 방지 기능을 무력화했다. 편시준이 평소처럼 충전기에 배터리를 연결해 손에 쥔 순간, 과충전으로 인한 폭발성 발화가 일어나 전신 화상과 저혈량성 쇼크로 사망했다.

### 결정적 시각·장소

사건 당일 18시 45분경, 스카이서킷 배터리 충전소 충전 랙 앞.

### 은폐

목인석은 평소 편시준이 배터리 정비를 직접 손보곤 했다는 점을 이용해 노후 배선 탓의 단순 발화 사고로 보이게 했고, 사건 당시 자신은 줄곧 접수 라운지에서 손님을 응대하고 있었다고 둘러댔다.

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