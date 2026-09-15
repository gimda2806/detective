# CASE045 — 라텍스가 마르기 전에
> 마스터를 쓰기 위한 **이야기 소스**다. 서버는 이 파일을 읽지 않는다 —
> `app/game.ts`의 케이스 로더가 `*.master.json`만 훑기 때문에 번들에도
> 들어가지 않는다. 여기 적힌 것을 재료로 같은 폴더의 `.master.json`을 채운다.

## 배경

국제 크리처 디자인 공모전 결선 시연을 사흘 앞둔 특수분장(SFX) 스튜디오 '모프랩(MorphLab)'. 결선용 크리처 수트의 안면 캐스팅을 마무리하던 수석 조형사가 이른 아침 밀폐된 캐스팅실 안에서 쓰러진 채 발견된다.

## 톤

장인 정신과 실적 경쟁이 얽힌 폐쇄적 공방 분위기. 한지우는 특수분장 도구와 소품에 호기심을 보이며 긴장을 누그러뜨린다.

## 탐정의 진입

- 경로: `curious_bystander`

탐정은 공모전 취재를 도와달라는 지인의 부탁으로 스튜디오 인근 공방거리를 둘러보던 중, 모프랩 앞에 몰린 구급차와 웅성거리는 스태프들을 보고 걸음을 멈춘다. 안면을 튼 스튜디오 직원이 얼결에 상황을 털어놓자, 탐정은 그대로 안으로 따라 들어간다.

## 진실

**진범**: 조태린 (CH04)
**공범**: 없음

### 동기

조태린은 개인 빚을 갚기 위해 모프랩의 독점 실리콘 배합법(바이오미메틱 스킨)을 경쟁 스튜디오 '크림슨 SFX'에 몰래 팔았다. 노윤결이 우연히 그 거래 메일을 보고 추궁하자, 결선 시연이 코앞인 상황에서 발각되면 계약 파기는 물론 형사 고발까지 이어질 것을 두려워했다.

### 수법

조태린은 캐스팅실의 환기 제어반을 수동으로 조작해 배기 모드를 정지시켰다. 노윤결이 그날 밤 홀로 남아 폴리우레탄 발포제로 캐스팅 작업을 마무리하리라는 걸 알고 있었고, 밀폐된 실내에 유해 유증기가 그대로 쌓이도록 방치했다.

### 결정적 시각·장소

20:30, L05 자재창고에서 환기 제어반 조작 / 21:40, L02 캐스팅실에서 노윤결이 유증기에 노출되어 쓰러짐.

### 은폐

조태린은 사고가 알려지자 환기 제어반의 조작 이력부터 초기화해 자신이 배기 모드를 껐다는 기록을 지웠다. 실리콘 배합법 거래 건은 끝까지 모르는 일이라 딱 잡아뗐고, 그날 밤은 계약서 검토로 자재창고 근처에도 안 갔다고 주장했다.

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