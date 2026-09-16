// 각 NPC에게 고정된 말투와 압박 시 반응을 준다.
//
// 원래는 전부 npc.id 해시로 배정했다. 모든 NPC가 나이·역할·거짓말 여부와
// 무관하게 같은 "그럴듯한 수사물 산문" 톤으로 말하던 것을 고치려고 만든
// 모듈이고, 그때는 스키마에 말투를 적을 자리가 없다고 보고 런타임에서
// 해결했다.
//
// 그런데 스키마에는 이미 voice_profile이 있었다. 마스터 289건 중 258건이
// 인물마다 말투·문장 길이 경향·말버릇을 적어 뒀는데, 변환기가 raw_text에
// 싣지 않아 런타임까지 오지 못했다 — pressure_responses/comic_tell이 겪은
// 것과 같은 사고다. 실플레이에서 CASE302의 노경아와 편도훈이 똑같은
// 다나까로 말했는데, 마스터는 둘 다 해요체로, 그것도 서로 다른 결로 적어
// 두고 있었다. 해시가 두 사람에게 나란히 습니다 계열을 뽑았을 뿐이다.
//
// 그래서 지금은 마스터가 적어 둔 것이 있으면 그것을 쓰고, 없을 때만
// 해시로 떨어진다. 마스터 쪽이 언제나 낫다 — 해시는 이 인물이 누구인지
// 모르지만 마스터는 안다 ("오빠 얘기가 나오면 오히려 말이 길어지며
// 억눌린 감정이 새어 나온다" 같은 건 해시가 낼 수 있는 값이 아니다).

const FORMALITY_REGISTERS = [
  {
    id: 'cautious_polite',
    description:
      'consistently very cautious, careful formal Korean (합쇼체: ~습니다/~습니까), with frequent small hedges such as 그게, 저는 — the register of someone speaking carefully to an authority figure',
  },
  {
    id: 'brisk_professional',
    description:
      'brief, businesslike polite Korean, clipped 습니다 endings with little softening — the register of someone who wants the conversation over quickly',
  },
  {
    id: 'warm_familiar',
    description:
      'warm, familiar 해요체 with occasional half-speech slips into 반말 fragments when comfortable or emotional — the register of someone who treats the detective almost like an acquaintance',
  },
  {
    id: 'blunt_senior',
    description:
      "an older or higher-status person's register: shorter sentences, occasional command-toned or paternal phrasing, sparing hedges — still polite, but carrying visible authority",
  },
] as const;

const DEFLECTION_STYLES = [
  {
    id: 'terse_withdrawal',
    description:
      'answers shrink to the bare minimum and the person tries to redirect to a different subject',
  },
  {
    id: 'over_explaining',
    description:
      'answers grow longer than necessary, over-justifying with excess detail as if pre-empting suspicion',
  },
  {
    id: 'counter_question',
    description:
      'responds to a pressing question with a question of their own, or asks why the detective wants to know',
  },
  {
    id: 'sudden_formality',
    description:
      'speech suddenly becomes more formal and distant than their normal formality_register, creating audible distance',
  },
] as const;

function hashToIndex(value: string, mod: number) {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash % mod;
}

export type NpcVoiceProfile = {
  npc_id: string;
  formality_register: string;
  deflection_style: string;
  verbal_tic?: string;
};

type MasterVoice = {
  voiceFormality: string;
  voiceSentenceLength: string;
  voiceTic: string;
};

export function buildNpcVoiceProfiles(
  npcs: Array<{ id: string }>,
  masterVoices: Record<string, MasterVoice> = {},
): NpcVoiceProfile[] {
  return npcs.map((npc) => {
    const master = masterVoices[npc.id];
    const formality = master?.voiceFormality?.trim();
    // 마스터의 sentence_length_tendency는 "압박받으면 말이 아예 끊긴다"처럼
    // 평소와 눌렸을 때가 어떻게 갈리는지를 적는 자리라, 해시의
    // deflection_style이 하던 일을 그대로, 더 그 인물답게 한다.
    const underPressure = master?.voiceSentenceLength?.trim();
    const tic = master?.voiceTic?.trim();
    return {
      npc_id: npc.id,
      formality_register:
        formality ||
        FORMALITY_REGISTERS[
          hashToIndex(`${npc.id}:formality`, FORMALITY_REGISTERS.length)
        ].description,
      deflection_style:
        underPressure ||
        DEFLECTION_STYLES[
          hashToIndex(`${npc.id}:deflection`, DEFLECTION_STYLES.length)
        ].description,
      ...(tic ? { verbal_tic: tic } : {}),
    };
  });
}
