# CASE081 — 양식장이 삼킨 산지
> 마스터를 쓰기 위한 **이야기 소스**다. 서버는 이 파일을 읽지 않는다 —
> `app/game.ts`의 케이스 로더가 `*.master.json`만 훑기 때문에 번들에도
> 들어가지 않는다. 여기 적힌 것을 재료로 같은 폴더의 `.master.json`을 채운다.

## 배경

수출용 원산지 인증 심사를 이틀 앞둔 전복양식장 '남해전복마을영어조합'의 양식장 관리동. 수출 물량 선별 작업이 한창이던 늦은 밤, 수석 양식관리사 강소경이 수조 선별장 안에서 쓰러진 채 발견돼 병원으로 옮겨졌으나 사망이 확인된다.

## 톤

수출 심사를 이틀 앞둔 조급함과, 바다 냄새 짙은 현장에서 벌어진 일이 주는 서늘함이 뒤섞인 분위기.

## 탐정의 진입

- 경로: `witnessed_incident`

탐정은 근처를 지나던 중 양식장 관리동에서 나는 소란을 직접 목격하고 발길을 멈췄다.

## 진실

**진범**: 석재희 (CH03)
**공범**: 없음

### 동기

석재희는 양식관리팀장으로서 양식산 전복 일부를 자연산 산지로 둔갑시켜 입식대장에 거짓 기재해 왔다. 강소경이 실제 입식 수량과 대장 기재 산지가 맞지 않는다는 것을 짚어내고, 이틀 뒤 협력사 실사단에게 그대로 알리겠다고 통보하자 석재희는 수출 인증 자체가 취소될 위기에 몰렸다.

### 수법

석재희는 이틀 전 수조 선별장 안전난간 고정 볼트 두 개를 미리 빼 두었다. 겉보기엔 평소와 다름없이 서 있는 듯했지만, 체중이 실리면 난간이 통째로 밀려날 수 있는 상태였다. 강소경이 늦은 밤 홀로 수출 물량을 선별하려 좁은 통로를 지나다 난간에 몸을 기대는 순간 난간이 밀려나며 그는 대형 수조 안으로 떨어졌고, 미처 빠져나오지 못한 채 물속에서 의식을 잃었다.

### 결정적 시각·장소

D-2, 오후, L03 수조 선별장에서 난간 볼트 제거 / D-1, 22:10, L03 수조 선별장에서 추락 및 익사 / D-1, 22:35, L03 수조 선별장에서 볼트 재장착.

### 은폐

석재희는 사고 직후 다시 선별장으로 돌아가 난간 볼트를 원래대로 끼워 넣었고, 그날 밤 자신은 선별장 근처에 간 적이 없다고 잡아뗐다.

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