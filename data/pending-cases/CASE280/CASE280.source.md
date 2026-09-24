# CASE280 — 그 온실의 마지막 뿌리
> 마스터를 쓰기 위한 **이야기 소스**다. 서버는 이 파일을 읽지 않는다 —
> `app/game.ts`의 케이스 로더가 `*.master.json`만 훑기 때문에 번들에도
> 들어가지 않는다. 여기 적힌 것을 재료로 같은 폴더의 `.master.json`을 채운다.

## 배경

도심 외곽 오래된 사유지에 자리한 국내 자생란 보존 온실 '청람원'. 창업주의 뒤를 이어 수석 원예사 남주형이 30년 가까이 희귀 자생란 계통을 홀로 지켜 왔고, 최근 상속인 서다인이 부지 매각과 보유 개체의 해외 반출을 추진하며 매입 대행 브로커 우인혁을 상주시켜 목록 작업을 진행해 왔다. 매니저 목서린이 방문객 응대와 기록을, 견습 원예사 편지오가 잔손질을 도맡아 왔고, 인근에서 작은 개인 온실을 운영하는 강여준도 종종 들러 개체를 눈여겨봐 왔다.

## 톤

차분하고 애틋한 정서극형 추리 — 온실 특유의 정적인 분위기 속에서 집착과 상실을 다루는 톤

## 탐정의 진입

- 경로: `media_or_content_creation`

탐정은 멸종위기 자생란 보존을 다루는 짧은 다큐멘터리 콘텐츠 촬영차 청람원을 방문해, 한지우와 함께 카메라를 든 채 전시홀 구석에서 촬영 각도를 잡고 있었다.

## 진실

**진범**: 남주형 (CH01)
**공범**: 없음

### 동기

30년간 홀로 지켜 온 국내 자생란 보존 계통이 해외로 반출·분산되면 다시는 복원할 수 없다는 믿음과 집착이, 매각을 성사시키려던 우인혁을 막아야 한다는 확신으로 이어졌다.

### 수법

환기창 평형추 도르래의 고정핀을 미리 뽑아 선반 뒤에 숨겨 두고, 사건 당일 우인혁을 특정 희귀 개체 앞 — 바로 그 평형추 바로 아래 — 로 자연스럽게 유도한 뒤 크랭크 손잡이를 당겨 평형추를 낙하시켰다.

### 결정적 시각·장소

사건 당일 13시 50분경, 본온실 전시홀에서.

### 은폐

낙하 직후 현장을 정리하고, 평소에도 노후해 부실했던 설비 유지보수 기록을 근거로 자연 오작동에 의한 사고처럼 보이게 했다.

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