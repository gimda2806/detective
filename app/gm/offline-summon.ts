// ---------------------------------------------------------------------------
// "한지우가 데려온다" — the one relocation the offline GM allows
//
// Master gives every character exactly one `present_location`, and no field to
// say they are ever anywhere else. The engine takes that literally: you meet
// someone where Master put them, which is most of what walking the map is for.
// The cost is that the moment the detective finds a card worth showing to
// someone they already met, the only way to use it is to walk back.
//
// This is the exception. The detective can send 한지우 to fetch one person
// they have already interviewed. One, because there is one 한지우 — fetching
// a second sends the first back to their post. Every first meeting therefore
// still happens where Master wrote it, and the map keeps meaning something,
// but the round trips are gone.
//
// The displacement lives in GameState.completed_actions as a marker rather
// than in a new state field: only the offline route has this idea, and the
// shared app/game.ts should not grow a shape for it. The marker carries a
// sequence number because game.ts folds completed actions in set-wise —
// without it, fetching someone back to a room they had been fetched to once
// before would be swallowed as a duplicate and silently do nothing.
// ---------------------------------------------------------------------------

export type SummonState = { npcId: string; locationId: string };

const MARKER = /^summoned\|([^|]+)\|([^|]+)\|/;

export function summonMarker(
  npcId: string,
  locationId: string,
  seq: number,
): string {
  return `summoned|${npcId}|${locationId}|${seq}`;
}

// The newest marker wins outright. There is never more than one person away
// from their post, so anybody holding an older marker is already back.
export function summonedNow(completedActions: string[]): SummonState | null {
  for (let i = completedActions.length - 1; i >= 0; i -= 1) {
    const match = completedActions[i].match(MARKER);
    if (match) return { npcId: match[1], locationId: match[2] };
  }

  return null;
}

// Where this person is standing right now: the room 한지우 brought them to if
// that is them, and Master's own present_location otherwise.
export function effectiveNpcLocation(
  home: string | undefined,
  completedActions: string[],
  npcId: string,
): string | undefined {
  const summoned = summonedNow(completedActions);

  return summoned && summoned.npcId === npcId ? summoned.locationId : home;
}
