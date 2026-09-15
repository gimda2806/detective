# CASE027 — 자개가 삼킨 숨
> 마스터를 쓰기 위한 **이야기 소스**다. 서버는 이 파일을 읽지 않는다 —
> `app/game.ts`의 케이스 로더가 `*.master.json`만 훑기 때문에 번들에도
> 들어가지 않는다. 여기 적힌 것을 재료로 같은 폴더의 `.master.json`을 채운다.

## 배경

해외 럭셔리 브랜드와의 한정판 컬렉션 론칭을 앞둔 3대째 나전칠기 공방 '나전방(螺鈿房)'. 안쪽에는 자개 광택용 산성 세척조가 있는 밀폐된 산세척실이 있다.

## 톤

정교한 자개무늬처럼 겹겹이 이어붙인 위장과 그 틈새로 배어나오는 죄책감을 씁쓸하게 들여다보는 톤.

## 탐정의 진입

탐정은 갑작스러운 소나기를 피해 처마 밑으로 뛰어든 곳이 마침 나전칠기 공방 '나전방' 정문 앞이었다가, 활짝 열린 문 안쪽에서 터져 나온 비명과 함께 사건과 마주친다.

## 진실

**진범**: 반태오 (CH02)
**공범**: 없음

### 동기

수년간 진짜 자개(전복, 야광패) 대신 값싼 합성 자개를 섞어 쓰며 원가 차액을 착복해 온 사실이 발각되면 공방과 자신의 커리어가 끝장난다는 위기감. 메종 노르와의 독점 협업 계약이 무산되고 사기 혐의로 법적 책임까지 질 상황을 막으려 했다.

### 수법

사건 전날 밤 산세척실에 몰래 들어가 환기팬 배선을 끊어 두고, 세척조의 산성 용액 농도를 평소보다 짙게 조작해 두었다. 다음 날 새벽 하선재가 몰래 산세척실에 들어와 진품 자개 대조 샘플을 확인하다 유증기에 질식해 의식을 잃고 세척조 옆으로 쓰러지며 팔과 상반신이 조에 잠겨 화학 화상을 입고 질식사했다.

### 결정적 시각·장소

사건 전날 23시경 산세척실(L03), 사건 당일 5시경 같은 장소.

### 은폐

사후 현장에 다시 들어가 하선재가 대조하려던 샘플 상자를 훔쳐 은닉하고, 환기팬 배선을 더 뜯어 원래 고장 나 있던 것처럼 위장해 단순 노후 설비 사고처럼 보이게 만들었다.

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