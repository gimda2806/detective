# CASE203 — 코일이 삼킨 이름
> 마스터를 쓰기 위한 **이야기 소스**다. 서버는 이 파일을 읽지 않는다 —
> `app/game.ts`의 케이스 로더가 `*.master.json`만 훑기 때문에 번들에도
> 들어가지 않는다. 여기 적힌 것을 재료로 같은 폴더의 `.master.json`을 채운다.

## 배경

지역 소규모 사설 과학체험관 '오로라랩'. 리뉴얼한 상설관 안쪽 '전자기 놀이터' 코너에서, 폐장 직후 관장이 쓰러진 채 발견된다.

## 톤

차분하지만 씁쓸한 여운이 남는 가족 드라마풍 미스터리

## 탐정의 진입

- 경로: `media_or_content_creation`

탐정은 개인 채널에 올릴 오로라랩 신규 상설관 소개 영상을 촬영하러 폐장 직후 방문했다가, 삼각대를 세우던 중 소동에 휘말린다.

## 진실

**진범**: 노형석 (CH01)
**공범**: 없음

### 동기

형과 함께 설계한 전자석 체험장치의 특허가 형 단독 명의로만 출원된 사실을 5주 전 우연히 알게 되면서, 오랫동안 쌓여온 소외감이 배신감으로 폭발했다.

### 수법

폐장 직후 아무도 없는 틈을 타 정비실 배전반의 인터록 우회 스위치를 젖혀 자기장 출력 제한을 해제해 두고, 형이 혼자 남아 코일 제어반을 점검하러 다가가는 순간 최대 출력이 걸리도록 만들어 페이스메이커의 오작동을 유도했다.

### 결정적 시각·장소

사건 당일 폐장 직후 정비실(L04)에서 인터록을 해제한 뒤, 저녁 시간대 전시장(L01) 코일 제어반 앞에서 실행됐다.

### 은폐

휴게실에서 정산 서류를 보고 있었다는 거짓 알리바이를 내세우고, 안전장치가 원래부터 오작동하기 쉬운 구식 설비였던 것처럼 둘러댈 준비를 해 두었다.

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