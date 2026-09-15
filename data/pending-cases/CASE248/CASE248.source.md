# CASE248 — 천장에 걸린 마지막 빛
> 마스터를 쓰기 위한 **이야기 소스**다. 서버는 이 파일을 읽지 않는다 —
> `app/game.ts`의 케이스 로더가 `*.master.json`만 훑기 때문에 번들에도
> 들어가지 않는다. 여기 적힌 것을 재료로 같은 폴더의 `.master.json`을 채운다.

## 배경

3대째 이어온 전통 유리공예 복원 공방 '글라스브리즈(GlassBreeze)'. 대표 겸 수석 장인 백무결이 조수 서한겸과 함께 의뢰받은 복원 작업을 꾸준히 맡아왔다. 평일 늦은 오전, 오랜만에 공방을 찾은 손님들 사이로 냉각실에서 뭔가 떨어지는 요란한 소리가 울리고, 백무결이 유리 파편에 목을 다친 채 쓰러져 있는 것이 발견된다.

## 톤

유리가 부서지는 소리처럼 서늘하면서도, 오래된 인연이 주는 온기가 함께 도는 톤. 탐정과 한지우의 가벼운 티키타카로 무게를 던다.

## 탐정의 진입

- 경로: `returning_former_affiliate`

탐정은 예전에 이 공방에서 반년간 도제 생활을 했었고, 오랜만에 개인적으로 옛 사수 남규완을 만나러 들렀다. 한지우는 자료 조사를 핑계로 따라와 공방 곳곳을 구경하고 있었다.

## 진실

**진범**: 서한겸 (CH01)
**공범**: 없음

### 동기

서한겸은 백무결과 오랜 연인 관계였으나, 백무결이 첫사랑이었던 유이한과 재회해 그녀와 새 출발을 준비하며 이별을 꺼내려 한다는 사실을 알게 되자 배신감과 질투에 휩싸여 그를 살해하기로 결심한다.

### 수법

서한겸이 냉각실 천장에 걸린 대형 유리 모빌의 고정 와이어 하나를 미리 사포로 갈아 약화시켜 두고, 검수 일정을 자청해 백무결이 정오에 그 바로 아래 작업대에서 시제품을 살피게 유도한다. 하중을 못 버틴 모빌이 떨어져 산산조각나며 그 파편이 백무결의 목 경동맥을 베어 과다출혈로 사망한다.

### 결정적 시각·장소

사건 당일 정오경, 냉각실 유리 모빌 아래 작업대.

### 은폐

서한겸은 공방의 고정 장치들이 오래돼 낡았다는 걸 알고 있었기에 단순 노후 와이어 파손 사고로 보이게 하려 했고, 사건 당시 자신은 줄곧 자재창고에서 재고 정리를 하고 있었다고 진술한다.

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