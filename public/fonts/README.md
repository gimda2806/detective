# 본문 서체 — Noto Serif CJK KR (서브셋)

오프라인 장면 로그의 **이야기 본문에만** 쓴다(`app/offline/offline.css` 의
`@font-face`). UI — 화자 이름표, 행동 표지, 수첩, 버튼 — 는 종전 산세리프
그대로다. 전자책도 본문만 명조이고 UI는 고딕이다.

## 이 파일이 무엇인가

`googlefonts/noto-cjk` 의 **`Serif/OTF/Korean/NotoSerifCJKkr-Regular.otf`
원본(24 MB)** 을 이 저장소에 실제로 쓰인 글자로만 서브셋한 것이다. 굵기는
Regular(400) 하나뿐이다.

- 글리프 1,678자 (한글 음절 1,398 + 한자 · 라틴 · 기호)
- **425 KB** (woff2)

재현:

```bash
curl -L -o orig.otf \
  https://raw.githubusercontent.com/googlefonts/noto-cjk/main/Serif/OTF/Korean/NotoSerifCJKkr-Regular.otf
# 저장소에 쓰인 글자를 모은 텍스트 파일을 chars.txt 로 만든 뒤
python3 -m fontTools.subset orig.otf --text-file=chars.txt --flavor=woff2 \
  --layout-features='*' --output-file=noto-serif-kr-400.woff2
```

**함정 하나 (한 번 밟았다):** Google Fonts 가 서빙하는 woff2 조각을 받아
병합하는 길로 먼저 갔는데, 가변 폰트 조각이라 `wght` 를 400 으로 고정해도
`name` 테이블에 `ExtraLight` 가 남고 획이 원본보다 가늘게 나왔다. 조각 병합
말고 **원본 OTF 에서 바로 서브셋**할 것.

## 왜 서브셋인가

Google Fonts 링크를 그대로 쓰면 **사건 하나에 0.7~1.2 MB** 를 받는다(400굵기
기준 실측: CASE030 1,213 KB / CASE100 891 KB / CASE005 729 KB). 한글을
코드포인트 블록으로 잘라 놓기 때문에, 한 사건이 쓰는 480자 남짓이 49 KB 짜리
조각 20~28개에 흩어져 있고 그 조각 안 글자의 12%만 쓴다. 서브셋 한 벌은
425 KB 를 한 번 받고 모든 사건에 캐시된다.

`public/` 에 있으므로 **Worker 스크립트 크기에 들어가지 않는다** — 사건
데이터(`public/cases/`)와 같은 경로로 정적 에셋이 된다.

## 새 글자가 생기면

코퍼스는 사실상 포화다 — 309건 기준 고유 음절 1,375자인데, **마지막 30건이
새로 들여온 음절이 14자, 마지막 9건은 0자**다. 그래도 새 사건이 서브셋에 없는
음절을 쓰면 **그 글자 하나만 산세리프로 떨어진다**(깨지지 않는다). 눈에 띄면
위 재현 절차로 다시 뽑으면 된다.

## 라이선스

SIL Open Font License 1.1 — `OFL.txt` (같은 `googlefonts/noto-cjk` 저장소의
`Serif/LICENSE`). 저작권 표시는 폰트 `name` 테이블에 그대로 남아 있다.
