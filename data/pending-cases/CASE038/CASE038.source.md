# CASE038 — 충전소가 삼킨 순위표
> 마스터를 쓰기 위한 **이야기 소스**다. 서버는 이 파일을 읽지 않는다 —
> `app/game.ts`의 케이스 로더가 `*.master.json`만 훑기 때문에 번들에도
> 들어가지 않는다. 여기 적힌 것을 재료로 같은 폴더의 `.master.json`을 채운다.

## 배경

전국 FPV 드론레이싱 챔피언십 지역 예선을 사흘 앞둔 사설 레이스파크 '볼트레인 레이스파크'. 이른 새벽 개인 테스트베이에서 최종 센서 점검을 하던 팀 소속 데이터분석가가 배터리 폭발과 함께 피어오른 연기 속에서 숨진 채 발견된다.

## 톤

예선을 앞둔 새벽의 긴장감과 매캐한 연기 냄새가 뒤섞인 공간.

## 탐정의 진입

- 경로: `outdoor_recreation`

탐정은 평소 취미로 즐기던 FPV 드론 레이싱을 연습하러 이른 새벽 레이스파크를 찾았다가, 테스트베이 쪽에서 피어오르는 연기와 마주친다.

## 진실

**진범**: 국하빈 (CH02)
**공범**: 없음

### 동기

국하빈은 온라인 불법 베팅 조직과 결탁해 지난 몇 달간 예선 레이스 랩타임 원본 센서 로그를 조작해 특정 선수의 순위를 유리하게 바꿔치기 해왔다. 데이터분석가 채동하가 원본 센서 로그와 공식 발표 기록 사이의 불일치를 발견하고 팀 대표에게 정식 조사를 요청하자, 국하빈은 발각이 임박했음을 느꼈다.

### 수법

국하빈은 사고 당일 새벽 정비고에서 채동하 전용 테스트용 드론 배터리팩의 보호회로 배선을 해제해 과충전 시 격렬하게 발화하도록 조작했다. 그리고 파트타임 정비보조 라시현에게 예정에 없던 부품 심부름을 시켜 안전 점검 담당을 자리에서 비우게 만들었다.

### 결정적 시각·장소

04:50, L03 정비고에서 배터리 보호회로 조작 / 05:10, L01에서 라시현을 심부름 보냄 / 05:58~06:00, L02 테스트베이에서 채동하가 유독 연기에 질식.

### 은폐

국하빈은 사고 소식이 전해지자마자 사무실 컴퓨터에서 원본 센서 로그 파일들을 삭제하고, 배터리 결함을 노후 부품 탓으로 몰아가려 한다.

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