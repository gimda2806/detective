# CASE037 — 닫힌 부스가 남긴 거짓말
> 마스터를 쓰기 위한 **이야기 소스**다. 서버는 이 파일을 읽지 않는다 —
> `app/game.ts`의 케이스 로더가 `*.master.json`만 훑기 때문에 번들에도
> 들어가지 않는다. 여기 적힌 것을 재료로 같은 폴더의 `.master.json`을 채운다.

## 배경

글로벌 게임사와의 프랜차이즈 라이선스 조인식을 하루 앞둔 이스케이프룸 디자인 스튜디오 '라비린스랩(Labyrinth Lab)'. 신작 시그니처 룸에 들어갈 안개 연출 테스트 부스를 최종 점검하던 중, 수석 크리에이티브 디렉터가 밀폐된 부스 안에서 질식사한 채 발견된다.

## 톤

조인식을 하루 앞둔 스타트업 특유의 긴장감과 압박감이 뒤섞인 공간.

## 탐정의 진입

- 경로: `employee_or_staff`

탐정은 최근 이 스튜디오에서 주말 파트타임 게임마스터로 일해 왔고, 오늘도 오전 근무 조로 출근했다가 사고 현장과 맞닥뜨린다.

## 진실

**진범**: 봉하늘 (CH02)
**공범**: 없음

### 동기

봉하늘은 프랜차이즈 선급금 중 상당액을 개인적으로 유용해 왔다. 최근 실사 과정에서 지출 불일치가 발견되기 시작했고, 최시은이 이를 눈치채고 직접 확인하겠다며 게임사 측 실사담당에게까지 언급하자 발각이 임박했음을 느꼈다.

### 수법

봉하늘은 사고 당일 새벽 사무실에서 회계 자료를 손본 뒤, 소품 제작실에서 테스트 부스의 통풍구 밸브를 잠갔다. 그리고 CO2 감시를 맡은 온소민에게 예정에 없던 심부름을 시켜, 최시은이 부스 안에서 이산화탄소가 정체되는 동안 아무도 비상 해제 버튼을 누르지 못하게 만들었다.

### 결정적 시각·장소

05:10, L04 사무실에서 회계 자료 수정 / 05:25, L03 소품 제작실에서 통풍구 밸브 조작 / 06:15, L02 테스트 부스에서 최시은이 이산화탄소에 질식.

### 은폐

봉하늘은 사고 직후 회계 시스템에 다시 접속해 선급금 지출 내역을 실사 자료와 맞춰 재작성했다. 통풍구 밸브 조작은 정기 캘리브레이션 절차였을 뿐이라고 둘러댔고, 온소민에게 심부름을 시킨 것도 사고와는 무관한 우연이라며 잡아뗐다.

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