// Assigns each NPC a fixed formality register and deflection style, purely
// at the runtime layer (derived from npc.id, not stored in Master). This is
// deliberately not a Master-generation concern: every NPC currently sounds
// like the same "plausible investigation prose" preset regardless of age,
// role, or whether they're lying — see the playtest-log diagnosis in the
// session this landed in. Deterministic hashing keeps a given NPC's voice
// stable for the whole session without needing a schema change upstream.

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
};

export function buildNpcVoiceProfiles(
  npcs: Array<{ id: string }>,
): NpcVoiceProfile[] {
  return npcs.map((npc) => ({
    npc_id: npc.id,
    formality_register:
      FORMALITY_REGISTERS[
        hashToIndex(`${npc.id}:formality`, FORMALITY_REGISTERS.length)
      ].description,
    deflection_style:
      DEFLECTION_STYLES[
        hashToIndex(`${npc.id}:deflection`, DEFLECTION_STYLES.length)
      ].description,
  }));
}
