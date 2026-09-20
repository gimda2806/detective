# CASE185 — 버튼 위의 먼지
> 마스터를 쓰기 위한 **이야기 소스**다. 서버는 이 파일을 읽지 않는다 —
> `app/game.ts`의 케이스 로더가 `*.master.json`만 훑기 때문에 번들에도
> 들어가지 않는다. 여기 적힌 것을 재료로 같은 폴더의 `.master.json`을 채운다.

## 배경

3대째 이어온 동네 볼링장 '골든핀 볼링클럽'. 매주 토요일 저녁 정기 리그가 한창이던 시각, 오랫동안 핀세터 기계를 관리해 온 정비기사가 레인 뒤편 기계실에서 가동 중이던 기계에 끼인 채 발견된다.

## 톤

일상적인 동호회 분위기 속에 갑작스러운 비극이 끼어드는 톤. 한지우의 넉살 좋은 농담이 초반 긴장을 누그러뜨리지만, 자백의 순간만큼은 무겁게 다룬다.

## 탐정의 진입

- 경로: `competitor_or_participant`

탐정과 한지우는 몇 달째 골든핀 볼링클럽의 토요 정기 리그에 정식 참가자로 등록해 매주 함께 게임을 치러 왔다.

## 진실

**진범**: 홍다경 (CH01)
**공범**: 없음

### 동기

3대째 볼링장을 물려받은 설아영의 남편 홍다경은, 창업주가 생전에 혼외 아들 원경환에게도 지분을 나눠주겠다고 적어 둔 육필 메모가 실재한다는 사실을 아내에게서 전해 듣고, 그 지분 요구가 볼링장 소유권을 흔들 것을 우려해 메모를 반드시 회수해야 한다는 생각에 사로잡혔다.

### 수법

오늘 18시 25분경 핀세터 기계실에서 홍다경은 원경환이 다시 꺼내 든 메모 사본을 빼앗으려다 실랑이 끝에 그를 밀쳤다. 뒤로 넘어진 원경환의 팔이 가동 중이던 체인 벨트에 끼여 순식간에 기계 안으로 끌려 들어갔고, 그 자리에서 목숨을 잃었다.

### 결정적 시각·장소

오늘 18시 20분~18시 27분경, 핀세터 기계실 안.

### 은폐

홍다경은 비상정지 버튼을 누르지 않은 채 기계실 문을 닫고 나와 태연히 접수대로 돌아가 리그 접수를 도왔다. 이어 원경환의 사물함 자물쇠 고리를 억지로 비틀어 열고 메모 원본을 회수해 없앴다.

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