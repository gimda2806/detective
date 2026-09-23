# CASE251 — 스무 해 뒤의 실격
> 마스터를 쓰기 위한 **이야기 소스**다. 서버는 이 파일을 읽지 않는다 —
> `app/game.ts`의 케이스 로더가 `*.master.json`만 훑기 때문에 번들에도
> 들어가지 않는다. 여기 적힌 것을 재료로 같은 폴더의 `.master.json`을 채운다.

## 배경

물소뿔과 대나무, 소힘줄을 결합해 각궁(角弓)을 짜 온 3대째 국궁방 '설곡궁방'과 그 부속 활터 '설곡정'. 대표 설무경이 수제자 목인규, 딸 설하빈과 함께 공방과 활터를 꾸려왔다. 평소와 다름없는 화요일 아침, 안채 침소에서 설무경이 의식을 잃은 채 발견돼 병원으로 옮겨지지만 끝내 숨을 거둔다.

## 톤

가업과 오래된 죄책감을 되짚는, 차분하고 씁쓸한 정서극.

## 탐정의 진입

- 경로: `outdoor_recreation`

탐정이 지역 활쏘기 체험 프로그램에 참가하러 이른 아침부터 활터에 나와 있다가, 안채 쪽에서 들려온 소란과 마주친다.

## 진실

**진범**: 목인규 (CH02)
**공범**: 없음

### 동기

아버지 목선호가 20년 전 경연에서 설무경의 부정한 개입으로 실격당하고 그 충격으로 스스로 세상을 등진 사실을 뒤늦게 알게 된 목인규가, 그 한을 갚기 위해 계획한 복수.

### 수법

목인규가 사대 계단 손잡이 볼트를 미리 풀어 설무경을 낙상시켜 대퇴부 골절을 유도하고, 이후 설무경의 처방 진통제를 약효가 약한 시판약으로 몰래 바꿔치기해 통증을 과소평가하게 만들어 병원 진료를 계속 미루게 함으로써 결국 지방색전증으로 사망에 이르게 했다.

### 결정적 시각·장소

사흘 전 오전 설곡정 사대 계단(낙상 유도)과 이후 사흘간 설무경의 침소(진통제 바꿔치기와 방치).

### 은폐

낙상은 계단 노후로 인한 단순 사고로, 사망은 고령에 따른 급성 심정지로 보이도록 정황을 그대로 방치해 두었다.

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