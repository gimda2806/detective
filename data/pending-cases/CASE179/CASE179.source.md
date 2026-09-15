# CASE179 — 무대 뒤에 남은 그을음
> 마스터를 쓰기 위한 **이야기 소스**다. 서버는 이 파일을 읽지 않는다 —
> `app/game.ts`의 케이스 로더가 `*.master.json`만 훑기 때문에 번들에도
> 들어가지 않는다. 여기 적힌 것을 재료로 같은 폴더의 `.master.json`을 채운다.

## 배경

대형 테마파크 부속 상설 호러 어트랙션 '나이트메어 하우스'. 핼러윈 시즌 야간 특별 개장이 한창이던 저녁, 간판 배우가 백스테이지 제어실에서 쓰러진 채 발견된다.

## 톤

긴장감 있는 백스테이지 스릴러 톤. 한지우의 능청스러운 관찰이 무게를 덜어내되, 자백 순간의 무게는 지킨다.

## 탐정의 진입

- 경로: `media_or_content_creation`

탐정은 핼러윈 시즌 한정으로 '나이트메어 하우스' 백스테이지를 담는 짧은 체험 콘텐츠를 촬영하러 야간 개장 시간에 맞춰 방문해 있었다.

## 진실

**진범**: 목시완 (CH01)
**공범**: 없음

### 동기

몇 년 전 소극장 시절, 목시완이 구상한 '정전 시퀀스' 연출안을 태하빈이 가로채 자신의 이름으로 발표해 크게 성공시켰고, 그 일로 목시완은 극단에서 밀려나 오랫동안 무명 생활을 했다. 나이트메어 하우스에서 재회한 뒤에도 태하빈이 그 일을 대수롭지 않게 여기는 태도에, 오래 눌러온 원한이 다시 끓어올랐다.

### 수법

목시완은 도하은이 잠시 자리를 비운 사이 제어실 배전반이 열린 채 방치된 것을 이용해, 통로를 지나던 태하빈을 불러 세워 표절 얘기를 꺼내다 몸싸움 끝에 그를 밀쳤다. 뒤로 넘어진 태하빈은 노출된 배전반 단자에 손을 짚었고 그대로 감전돼 서서히 의식을 잃었다.

### 결정적 시각·장소

18시 13분경, 제어실.

### 은폐

목시완은 배전반 덮개를 닫고 접지선을 원래대로 끼워 넣어 사고 흔적을 지운 뒤, 정비일지의 점검 시각과 담당자 이름을 도하은의 것으로 앞당겨 고쳐 적어 책임을 그녀에게 돌리려 했다. 이후 태연히 로비로 돌아가 다음 회차 준비를 지휘하며 알리바이를 만들었다.

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