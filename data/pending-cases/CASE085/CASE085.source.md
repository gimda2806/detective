# CASE085 — 래커부스가 삼킨 등급
> 마스터를 쓰기 위한 **이야기 소스**다. 서버는 이 파일을 읽지 않는다 —
> `app/game.ts`의 케이스 로더가 `*.master.json`만 훑기 때문에 번들에도
> 들어가지 않는다. 여기 적힌 것을 재료로 같은 폴더의 `.master.json`을 채운다.

## 배경

국제 악기박람회 출품 인증을 사흘 앞둔 커스텀 기타 제작공방 '스트링크래프트'의 목공·도장 작업동. 출품작 마지막 래커 도장 작업이 한창이던 늦은 밤, 수석 루시어 류승솔이 래커도장부스 안에서 쓰러진 채 발견돼 병원으로 옮겨졌으나 사망이 확인된다.

## 톤

국제 박람회 출품을 사흘 앞둔 들뜬 분위기가 순식간에 얼어붙는 낙차와, 공방 특유의 나무·래커 냄새 속에 감도는 서늘함이 뒤섞인 분위기.

## 탐정의 진입

- 경로: `group_member`

탐정은 스트링크래프트 후원회 정기 모임 회원으로서, 그날 저녁 공방에서 열린 출품작 시연회에 참석해 있었다.

## 진실

**진범**: 주지민 (CH03)
**공범**: 없음

### 동기

주지민은 등급이 낮은 원목을 상급으로 둔갑시켜 매입하고 차액을 챙겨 온 사람이었다. 류승솔이 매입 단가와 실제 원목 등급 사이의 어긋남을 짚어내 국제 악기박람회 초빙 감정위원에게 사흘 뒤 그대로 알리겠다고 통보하자, 주지민은 출품 심사 전에 그 폭로를 막아설 방법을 찾아야 했다.

### 수법

그날 밤 다툰 직후, 주지민은 래커도장부스 위쪽 건조랙 고정 브래킷을 몰래 풀어 두었다. 얼마 후 출품작 마무리 도장을 하러 부스 안으로 들어간 류승솔이 건조랙 바로 아래서 작업을 시작하자, 무거운 건조랙이 그대로 쏟아져 내려 머리와 등을 강타했고 류승솔은 그 자리에서 쓰러졌다.

### 결정적 시각·장소

D-1, 19:55, L03 래커도장부스에서 브래킷 풀어놓기 / D-1, 20:25, L03 래커도장부스에서 낙하 사고 / D-1, 20:40, L03 래커도장부스에서 브래킷 원상복구.

### 은폐

주지민은 사고 직후 건조랙 브래킷을 다시 조여 놓아, 애초부터 느슨해진 적이 없었던 것처럼 꾸며 두었다.

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