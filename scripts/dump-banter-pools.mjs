// 갈래별 대사 표를 문서로 뽑는다 — docs/banter-pools.md
//
//   npm run pools:doc
//
// 사람이 채울 자리라 문서가 필요한데, 손으로 옮겨 적으면 엔진과 금방
// 어긋난다. 그래서 `app/gm/offline-engine.ts` 에서 그대로 읽어 온다.
// 설명(포맷·규칙)은 이 파일 안의 상수이고, 목록은 매번 새로 뽑는다.
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = readFileSync(`${ROOT}/app/gm/offline-engine.ts`, 'utf8');

const CODES = [
  ['forthcoming', '먼저 말을 붙이고 묻지 않은 것도 말한다'],
  ['courteous', '예의 바르게 성실히 답한다'],
  ['procedural', '직무로 답한다. 기록·절차·수치를 앞세운다'],
  ['unruffled', '서두르지 않는다. 여유가 있다'],
  ['guarded', '선을 긋는다. 필요 이상을 말하지 않는다'],
  ['imperious', '따지거나 가르치려 든다'],
  ['skittish', '겁먹었거나 눈치를 본다'],
];

const TABLES = [
  {
    name: 'FIRST_WORD',
    title: '첫마디',
    when: '탐정이 처음 말을 걸었을 때. 사건 내내 그 사람에게 한 번뿐이다.',
    who: '**그 인물이 하는 말.** 따옴표 안에 넣는다.',
    vars: '없다. 이름을 쓰지 않는다 — 소개 한 줄이 바로 앞에 따로 나간다.',
  },
  {
    name: 'LEAD_ASK_BY_KIND',
    title: '카드 턴의 지문',
    when: '증언 카드를 물어봤을 때, 그 사람이 대답하기 직전.',
    who: '**3인칭 지문.** 따옴표 없이 `…다.` 로 끝낸다.',
    vars: '`{topic}` = 이름+은/는 · `{name}` = 이름 그대로',
  },
  {
    name: 'ASK_CLOSING_BY_KIND',
    title: '탐정의 맺음말',
    when: '증언 카드를 물어보는 그 턴, 탐정이 실제로 던지는 말.',
    who: '**탐정이 하는 말.** 다른 인물에게는 존댓말이다. 따옴표는 엔진이 씌우므로 쓰지 않는다.',
    vars:
      '`{topic}` = **여기서만 다르다.** 이름이 아니라 `discovery_condition` 에서 뽑은 물어볼 것이다' +
      '(「발견 당시 상황을」, 「어르신이 어떻게 승낙했는지」). 그 뒤에 자연스럽게 붙는 말만 쓴다 — ' +
      '끝 글자가 을·를·지·해·시 다섯 가지다.',
  },
  {
    name: 'LEAD_STAGE_BREAK_BY_KIND',
    title: '무너질 때',
    when: '카드가 먹혀서 그 사람의 이야기가 한 칸 물러설 때. 사건당 서너 번.',
    who: '**3인칭 지문.** 따옴표 없이 `…다.` 로 끝낸다.',
    vars: '`{topic}` = 이름+은/는 · `{name}` = 이름 그대로',
  },
];

function readTable(name) {
  const block = new RegExp(
    `const ${name}: Record<string, string\\[\\]> = \\{(.*?)\\n\\};`,
    's',
  ).exec(src);
  if (!block) throw new Error(`${name} 을 못 찾았다`);
  const out = {};
  for (const [code] of CODES) {
    const arr = new RegExp(`^  ${code}: \\[(.*?)^  \\],`, 'sm').exec(block[1]);
    out[code] = arr
      ? [...arr[1].matchAll(/^\s+'(.*)',$/gm)].map((m) => m[1])
      : [];
  }
  return out;
}

const RULES = `# 갈래별 대사 표 — 채우는 법

인물마다 **면담 태도**(\`voice_profile.stance\`)가 일곱 중 하나로 정해져 있고,
런타임이 그 값으로 아래 네 자리의 대사를 고른다. 이 문서는 **사람이 줄을
채우는 자리**다.

> 목록은 \`npm run pools:doc\` 이 \`app/gm/offline-engine.ts\` 에서 그대로 뽑는다.
> **이 파일을 고쳐도 게임은 안 바뀐다** — 여기에 쓴 줄을 엔진의 같은 표에
> 옮겨 넣어야 한다. 옮긴 뒤 이 명령을 다시 돌리면 목록이 맞춰진다.

## 어디에나 해당하는 것

- **조사를 손으로 쓰지 않는다.** 이름 뒤에 은/는을 붙일 일이면 \`{topic}\` 을
  쓴다 — 받침을 보고 엔진이 고른다. \`{name}은\` 처럼 쓰면 「성우진은」과
  「하연우은」이 같이 나온다.
- **말은 따옴표 안, 지문은 따옴표 밖.** 섞어 쓰지 않는다. 화면이 따옴표를
  보고 대사를 제 줄로 내려 세운다.
- **말투 규칙은 그대로다.** 탐정은 한지우에게 반말, 한지우는 탐정에게
  반존대(-요), 그 밖의 인물에게는 둘 다 존댓말. 인물이 탐정에게 하는 말은
  존댓말이다.
- **범인을 흘리지 않는다.** 이 표는 태도별이지 역할별이 아니다. 「뭔가
  숨기는 듯한」처럼 혐의를 암시하는 줄은 그 태도인 사람 전부에게 나가므로
  애먼 사람까지 수상해진다.
- **시각은 아라비아 숫자로.** 「여덟 시 반」이 아니라 「8시 30분」.
- 줄 끝 마침표를 빠뜨리지 않는다. 엔진이 붙여 주지 않는다.

## 일곱 갈래

${CODES.map(([c, d]) => `- \`${c}\` — ${d}`).join('\n')}
`;

const parts = [RULES];
for (const t of TABLES) {
  const table = readTable(t.name);
  const total = Object.values(table).reduce((n, v) => n + v.length, 0);
  parts.push(
    `\n---\n\n## ${t.title} · \`${t.name}\`  (지금 ${total}줄)\n\n` +
      `**언제** ${t.when}\n\n**누가** ${t.who}\n\n**쓸 수 있는 것** ${t.vars}\n` +
      // 조사 경고는 맨 위에도 있지만 네 번 연속 같은 자리가 걸렸다.
      // 지문이 있는 표에서만 문제가 되므로 그 두 절 머리에만 박는다.
      (t.name === 'FIRST_WORD' || t.name === 'ASK_CLOSING_BY_KIND'
        ? ''
        : '\n> **`{name}이` / `{name}은` 처럼 조사를 붙여 쓰지 않는다.** 받침 없는\n' +
          '> 이름에서 「하연우이」가 된다. 은/는 자리는 `{topic}`, 그 밖에는\n' +
          '> `{name}의` 만 쓴다.\n'),
  );
  for (const [code, desc] of CODES) {
    const lines = table[code];
    parts.push(
      `\n### \`${code}\` — ${desc}  (${lines.length}줄)\n\n` +
        lines.map((l) => `- ${l}`).join('\n') +
        '\n',
    );
  }
}

writeFileSync(`${ROOT}/docs/banter-pools.md`, parts.join('') + '\n', 'utf8');
console.log('docs/banter-pools.md 를 새로 썼다');
