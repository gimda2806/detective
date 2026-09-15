# CASE024 — 시위를 놓은 손
> 마스터를 쓰기 위한 **이야기 소스**다. 서버는 이 파일을 읽지 않는다 —
> `app/game.ts`의 케이스 로더가 `*.master.json`만 훑기 때문에 번들에도
> 들어가지 않는다. 여기 적힌 것을 재료로 같은 폴더의 `.master.json`을 채운다.

## 배경

3대째 이어온 전통 활 명인 공방 '만작당(彎作堂)'과 부속 활터. 국가무형유산 국궁장 명인 인증 심사를 겸한 전국 국궁대회 개막 시연 당일 아침, 이번 심사를 맡은 협회 심사위원장이 공방 부속 대기실에서 쓰러진 채 발견된다.

## 톤

전통과 자존심이 뒤섞인 폐쇄적인 공방 분위기.

## 탐정의 진입

탐정은 미리 예매해 둔 개막 시연 관람권으로 활터 관람석에 앉아 있던 중, 시작을 알리는 안내가 채 끝나기도 전 대기실 쪽에서 벌어진 소동을 눈앞에서 마주친다.

## 진실

**진범**: 성재윤 (CH02)
**공범**: 없음

### 동기

성재윤은 이번 국궁장 명인 인증 심사를 앞두고 심사위원장 명도현에게 돈을 건네 유리한 평가를 받기로 했었다. 그런데 시연 전날 밤, 명도현이 양심의 가책으로 돈을 돌려주고 매수 사실을 협회에 알리겠다고 통보하자, 후계자 자리와 그동안 쌓아온 것이 모두 무너질 것을 우려해 그를 막기로 했다.

### 수법

성재윤은 명도현이 대기실 냉장 보관함에 넣어 둔 개인 인슐린 자가주사기를 몰래 미리 준비한 고용량 주사기로 바꿔치기했다. 이튿날 새벽 명도현이 평소처럼 그 주사기로 인슐린을 자가주사하자 심각한 저혈당 쇼크가 와 쓰러졌다.

### 결정적 시각·장소

전날 밤 22:30~22:35경, 대기실(L02)에서 주사기 바꿔치기 및 창고(L05)에 원본 은닉 / 당일 05:50경, 대기실(L02)에서 명도현이 인슐린 자가주사 후 쓰러짐.

### 은폐

성재윤은 그 시간 내내 작업실에서 혼자 활을 정비하고 있었다고 주장하며, 명도현의 죽음을 지병(당뇨) 악화로 인한 사고로 몰아간다.

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